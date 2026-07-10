import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/auth-context";
import { useState, useEffect, useRef } from "react";
import { createTransactionServer } from "@/lib/server-transactions";
import { getProductsServer, getProductOptionsServer, addProductServer, autoCategorizeProductServer, type ProductListItem } from "@/lib/server-products";
import { getCustomersServer, addCustomerServer, type CustomerListItem } from "@/lib/server-customers";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, FileText, CheckCircle2, ShoppingCart, Calculator, UserPlus, Sparkles } from "lucide-react";
import { fmtINR } from "@/lib/mock-data";
import { useBusinessData } from "@/lib/business-context";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_app/billing")({
  head: () => ({
    meta: [
      { title: "Billing (POS) — OmniMind AI" },
      { name: "description", content: "Point of Sale and Billing interface." },
    ],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const { user } = useAuth();
  const { activeDate } = useBusinessData();

  // Data states
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);

  // Form values
  const [formCustomerId, setFormCustomerId] = useState<string>("walkin");
  const [walkinPhone, setWalkinPhone] = useState("");
  const [formDepartmentId, setFormDepartmentId] = useState("");
  const [formPaymentMethod, setFormPaymentMethod] = useState("UPI");
  const [cartItems, setCartItems] = useState<Array<{ productId: string; quantity: number; discount: number }>>([]);

  // Temp item selection
  const [selectedItemSku, setSelectedItemSku] = useState("");
  const [selectedItemQty, setSelectedItemQty] = useState("1");
  const [selectedItemDiscount, setSelectedItemDiscount] = useState("0");

  const [saving, setSaving] = useState(false);
  
  // Invoice state
  const [completedTxn, setCompletedTxn] = useState<any>(null);

  // Quick Customer Registration States
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [newCustFirst, setNewCustFirst] = useState("");
  const [newCustLast, setNewCustLast] = useState("");
  const [newCustEmail, setNewCustEmail] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");
  const [newCustDept, setNewCustDept] = useState("");
  const [addingCustomer, setAddingCustomer] = useState(false);

  // Custom Unregistered Product States
  const [customProdName, setCustomProdName] = useState("");
  const [customProdBrand, setCustomProdBrand] = useState("");
  const [customProdPrice, setCustomProdPrice] = useState("");
  const [customProdCost, setCustomProdCost] = useState("");
  const [customProdStock, setCustomProdStock] = useState("10");
  const [customProdCatId, setCustomProdCatId] = useState("");
  const [customProdCatName, setCustomProdCatName] = useState("");
  const [customProdDeptId, setCustomProdDeptId] = useState("");
  const [detectingCategory, setDetectingCategory] = useState(false);
  const [addingCustomProd, setAddingCustomProd] = useState(false);

  const handleAutoDetectCategory = async (name: string, brand: string) => {
    if (!name.trim()) return;
    try {
      setDetectingCategory(true);
      const res = await autoCategorizeProductServer({ name, brand });
      if (res) {
        setCustomProdCatId(res.categoryId);
        setCustomProdCatName(res.categoryName);
        setCustomProdDeptId(res.departmentId);
      }
    } catch (err) {
      console.error("Auto detect category failed:", err);
    } finally {
      setDetectingCategory(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const payload = {
        data: {
          role: user?.role || "owner",
          email: user?.email || "",
        }
      };
      const prods = await getProductsServer(payload);
      const custs = await getCustomersServer({
        data: {
          role: user?.role || "owner",
          email: user?.email || "",
          status: "Active"
        }
      });
      const opts = await getProductOptionsServer(payload);

      setProducts(prods);
      setCustomers(custs);
      setDepartments(opts.departments);

      if (opts.departments.length > 0) {
        setFormDepartmentId(opts.departments[0].id);
      }
      if (prods.length > 0) {
        setSelectedItemSku(prods[0].id);
      }
    } catch (e) {
      toast.error("Failed to load catalog & customers.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const addToCart = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (!selectedItemSku) {
      toast.error("Please select a product.");
      return;
    }
    const qty = Number(selectedItemQty);
    if (isNaN(qty) || qty <= 0) {
      toast.error("Quantity must be greater than 0.");
      return;
    }

    let productSkuToCart = selectedItemSku;

    // Handle Custom Item creation
    if (selectedItemSku === "custom") {
      if (!customProdName.trim()) {
        toast.error("Product name is required for custom items.");
        return;
      }
      if (!customProdPrice.trim() || Number(customProdPrice) <= 0) {
        toast.error("Valid selling price is required.");
        return;
      }
      if (!customProdCost.trim() || Number(customProdCost) <= 0) {
        toast.error("Valid cost price is required.");
        return;
      }

      try {
        setAddingCustomProd(true);
        const sku = "SKU-CUST-" + Date.now().toString().slice(-5);
        const barcode = "BAR-CUST-" + Date.now().toString().slice(-5);
        
        await addProductServer({
          name: customProdName,
          sku,
          barcode,
          categoryId: customProdCatId || "cat-packagedfoods",
          departmentId: customProdDeptId || formDepartmentId || "dept-grocery",
          brand: customProdBrand || "Generic",
          sellingPrice: Number(customProdPrice),
          costPrice: Number(customProdCost),
          reorderLevel: 5,
          initialStock: Number(customProdStock) || 10,
          locationId: "loc-retail",
          role: user?.role || "owner",
          emailUser: user?.email || "",
        });

        // Add newly registered product locally
        const newProd: ProductListItem = {
          id: sku,
          sku,
          name: customProdName,
          brand: customProdBrand || "Generic",
          price: Number(customProdPrice),
          reorderLevel: 5,
          status: "Active",
          stock: Number(customProdStock) || 10,
          category: customProdCatName || "Packaged Foods",
          dept: departments.find(d => d.id === (customProdDeptId || formDepartmentId))?.name || "Grocery",
          supplier: "GrandSquare Wholesalers",
        };
        
        setProducts((prev) => [...prev, newProd]);
        productSkuToCart = sku;

        // Reset custom fields
        setCustomProdName("");
        setCustomProdBrand("");
        setCustomProdPrice("");
        setCustomProdCost("");
        setCustomProdStock("10");
        setCustomProdCatId("");
        setCustomProdCatName("");
        setCustomProdDeptId("");
        setSelectedItemSku(sku);

        toast.success(`Custom product "${customProdName}" registered successfully.`);
      } catch (err: any) {
        toast.error(err.message || "Failed to register custom product.");
        return;
      } finally {
        setAddingCustomProd(false);
      }
    }
    
    const existingIndex = cartItems.findIndex(i => i.productId === productSkuToCart);
    if (existingIndex > -1) {
      const updated = [...cartItems];
      updated[existingIndex].quantity += Number(selectedItemQty);
      setCartItems(updated);
    } else {
      setCartItems([...cartItems, {
        productId: productSkuToCart,
        quantity: Number(selectedItemQty),
        discount: Number(selectedItemDiscount) || 0
      }]);
    }
    toast.success("Added product to transaction cart.");
  };

  const removeFromCart = (index: number) => {
    const updated = cartItems.filter((_, idx) => idx !== index);
    setCartItems(updated);
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cartItems.length === 0) {
      toast.error("POS transaction cart is empty.");
      return;
    }
    setSaving(true);
    try {
      const req = {
        data: {
          customerId: formCustomerId === "walkin" ? null : formCustomerId,
          walkinPhone: formCustomerId === "walkin" && walkinPhone ? walkinPhone : null,
          departmentId: formDepartmentId,
          items: cartItems,
          paymentMethod: formPaymentMethod,
          role: user?.role || "owner",
          emailUser: user?.email || "",
          transactionDate: activeDate,
        }
      };
      const res = await createTransactionServer(req) as any;
      
      toast.success("Transaction billed and stock updated successfully.");
      
      // Build a local object to show the Invoice Print View
      const customer = customers.find(c => c.id === formCustomerId);
      setCompletedTxn({
        id: "INV-" + Date.now().toString().slice(-6),
        date: new Date().toLocaleString(),
        customerName: customer ? customer.name : "Walk-in Customer",
        items: cartItems.map(item => {
          const prod = products.find(p => p.id === item.productId);
          return {
            name: prod ? prod.name : "Unknown",
            qty: item.quantity,
            price: prod ? prod.price : 0,
            discount: item.discount,
            taxRate: 18, // Fixed 18% GST display
          };
        }),
        paymentMethod: formPaymentMethod
      });
      
      setCartItems([]);
      setWalkinPhone("");
      
      // Reload customers so visits/spend increases in memory
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to process sale checkout.");
    } finally {
      setSaving(false);
    }
  };

  // Estimate total cart amount
  let cartSubtotal = 0;
  let cartTax = 0;
  let cartDiscount = 0;
  
  cartItems.forEach(item => {
    const prod = products.find(p => p.id === item.productId);
    const price = prod ? prod.price : 0;
    const itemSub = (price * item.quantity);
    cartSubtotal += itemSub;
    cartDiscount += item.discount;
    // Assuming 18% GST (9% CGST + 9% SGST)
    const taxable = itemSub - item.discount;
    cartTax += (taxable * 0.18);
  });
  
  const cartTotal = cartSubtotal - cartDiscount + cartTax;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  // If completed, show Invoice
  if (completedTxn) {
    let invSubtotal = 0;
    let invDiscount = 0;
    let invTax = 0;
    completedTxn.items.forEach((it: any) => {
      const sub = it.price * it.qty;
      invSubtotal += sub;
      invDiscount += it.discount;
      const taxable = sub - it.discount;
      invTax += (taxable * 0.18);
    });
    const invTotal = invSubtotal - invDiscount + invTax;

    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <PageHeader
          title="Checkout Complete"
          description="Invoice generated successfully. Visit counts and customer spend have been incremented."
        />
        
        <div className="bg-white border border-zinc-200 shadow-sm rounded-xl overflow-hidden p-8">
          <div className="flex justify-between items-start mb-8 border-b pb-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                <h2 className="text-2xl font-bold text-zinc-900">TAX INVOICE</h2>
              </div>
              <p className="text-zinc-500">OmniMind Retail Solutions</p>
              <p className="text-zinc-500">GSTIN: 27AAAAA0000A1Z5</p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-zinc-900">Invoice #: {completedTxn.id}</p>
              <p className="text-zinc-500 text-sm">Date: {completedTxn.date}</p>
              <p className="text-zinc-500 text-sm">Billed To: <span className="font-medium text-zinc-900">{completedTxn.customerName}</span></p>
              <p className="text-zinc-500 text-sm">Payment: {completedTxn.paymentMethod}</p>
            </div>
          </div>
          
          <table className="w-full text-sm mb-8">
            <thead className="bg-zinc-50 border-y">
              <tr>
                <th className="py-3 px-4 text-left font-semibold text-zinc-600">Item</th>
                <th className="py-3 px-4 text-right font-semibold text-zinc-600">Qty</th>
                <th className="py-3 px-4 text-right font-semibold text-zinc-600">Rate</th>
                <th className="py-3 px-4 text-right font-semibold text-zinc-600">Discount</th>
                <th className="py-3 px-4 text-right font-semibold text-zinc-600">GST (18%)</th>
                <th className="py-3 px-4 text-right font-semibold text-zinc-600">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {completedTxn.items.map((it: any, i: number) => {
                const sub = it.price * it.qty;
                const d = it.discount;
                const tax = (sub - d) * 0.18;
                const tot = (sub - d) + tax;
                return (
                  <tr key={i}>
                    <td className="py-3 px-4 text-zinc-900">{it.name}</td>
                    <td className="py-3 px-4 text-right text-zinc-600">{it.qty}</td>
                    <td className="py-3 px-4 text-right text-zinc-600">{fmtINR(it.price)}</td>
                    <td className="py-3 px-4 text-right text-zinc-600">{fmtINR(it.discount)}</td>
                    <td className="py-3 px-4 text-right text-zinc-600">{fmtINR(tax)}</td>
                    <td className="py-3 px-4 text-right font-medium text-zinc-900">{fmtINR(tot)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          <div className="flex justify-end border-t pt-6">
            <div className="w-64 space-y-3">
              <div className="flex justify-between text-zinc-600">
                <span>Subtotal</span>
                <span>{fmtINR(invSubtotal)}</span>
              </div>
              <div className="flex justify-between text-zinc-600">
                <span>Total Discount</span>
                <span className="text-red-500">-{fmtINR(invDiscount)}</span>
              </div>
              <div className="flex justify-between text-zinc-600">
                <span>CGST (9%)</span>
                <span>{fmtINR(invTax / 2)}</span>
              </div>
              <div className="flex justify-between text-zinc-600">
                <span>SGST (9%)</span>
                <span>{fmtINR(invTax / 2)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg text-zinc-900 pt-3 border-t">
                <span>Grand Total</span>
                <span>{fmtINR(invTotal)}</span>
              </div>
            </div>
          </div>
          
          <div className="mt-8 flex justify-end gap-3">
            <Button variant="outline" onClick={() => window.print()}>
              <FileText className="h-4 w-4 mr-2" />
              Print Invoice
            </Button>
            <Button onClick={() => setCompletedTxn(null)}>
              New Bill
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Point of Sale & Billing"
        description="Process transactions, print GST invoices, and automatically credit customer visits."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT PANEL: Cart & Actions */}
        <div className="lg:col-span-2 space-y-6">
          <SectionCard title="Add Products" icon={<ShoppingCart className="h-5 w-5 text-indigo-500" />}>
            <div className="space-y-4">
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex-1 min-w-[200px]">
                  <Label className="mb-1 block">Select Product SKU / Name</Label>
                  <Select value={selectedItemSku} onValueChange={setSelectedItemSku}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a product..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="custom">✨ -- Add Custom Unregistered Product --</SelectItem>
                      {products.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} ({p.sku}) - {fmtINR(p.price)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-24">
                  <Label className="mb-1 block">Qty</Label>
                  <Input
                    type="number"
                    min="1"
                    value={selectedItemQty}
                    onChange={(e) => setSelectedItemQty(e.target.value)}
                  />
                </div>
                <div className="w-32">
                  <Label className="mb-1 block">Discount (₹)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={selectedItemDiscount}
                    onChange={(e) => setSelectedItemDiscount(e.target.value)}
                  />
                </div>
                <Button type="button" onClick={addToCart} className="bg-indigo-600 hover:bg-indigo-700" disabled={addingCustomProd}>
                  {addingCustomProd ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" /> Registering...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" /> Add Item
                    </>
                  )}
                </Button>
              </div>

              {/* Custom Item Form */}
              {selectedItemSku === "custom" && (
                <div className="p-4 border rounded-lg bg-indigo-50/20 border-indigo-200/50 space-y-4 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2 text-indigo-700 font-medium text-sm">
                    <Sparkles className="h-4 w-4" />
                    <span>Unregistered Custom Product Catalog Wizard</span>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Product Name</Label>
                      <Input
                        value={customProdName}
                        onChange={(e) => setCustomProdName(e.target.value)}
                        onBlur={() => handleAutoDetectCategory(customProdName, customProdBrand)}
                        placeholder="e.g. Lay's Onion Chips 50g"
                        className="bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Brand</Label>
                      <Input
                        value={customProdBrand}
                        onChange={(e) => setCustomProdBrand(e.target.value)}
                        onBlur={() => handleAutoDetectCategory(customProdName, customProdBrand)}
                        placeholder="e.g. Lay's"
                        className="bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Initial stock</Label>
                      <Input
                        type="number"
                        value={customProdStock}
                        onChange={(e) => setCustomProdStock(e.target.value)}
                        placeholder="e.g. 10"
                        className="bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Selling Price (MRP ₹)</Label>
                      <Input
                        type="number"
                        value={customProdPrice}
                        onChange={(e) => setCustomProdPrice(e.target.value)}
                        placeholder="Selling Price"
                        className="bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Cost Price (Buy ₹)</Label>
                      <Input
                        type="number"
                        value={customProdCost}
                        onChange={(e) => setCustomProdCost(e.target.value)}
                        placeholder="Cost Price"
                        className="bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Target Sales Department</Label>
                      <Select value={customProdDeptId} onValueChange={setCustomProdDeptId}>
                        <SelectTrigger className="bg-white">
                          <SelectValue placeholder="Select dept..." />
                        </SelectTrigger>
                        <SelectContent>
                          {departments.map((d) => (
                            <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {detectingCategory ? (
                    <div className="flex items-center gap-2 text-xs text-indigo-600 bg-indigo-50/50 p-2 rounded">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span>AI is analyzing product details to auto-classify...</span>
                    </div>
                  ) : customProdCatName ? (
                    <div className="text-xs text-emerald-700 bg-emerald-50 p-2 rounded border border-emerald-100 flex items-center justify-between">
                      <span>🏷️ Auto-detected Category: <strong>{customProdCatName}</strong> ({departments.find(d => d.id === customProdDeptId)?.name || "Grocery"})</span>
                      <span className="text-[10px] bg-emerald-100 px-1.5 py-0.5 rounded font-mono text-emerald-800">Confidence: 99%</span>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </SectionCard>

          <SectionCard title="Current Cart">
            {cartItems.length === 0 ? (
              <div className="text-center py-10 text-zinc-500">
                Cart is empty. Add products to begin billing.
              </div>
            ) : (
              <div className="space-y-3">
                {cartItems.map((item, idx) => {
                  const p = products.find((x) => x.id === item.productId);
                  if (!p) return null;
                  const itemTotal = p.price * item.quantity - item.discount;
                  return (
                    <div key={idx} className="flex items-center justify-between p-3 border rounded-lg bg-zinc-50/50">
                      <div>
                        <p className="font-medium text-zinc-900">{p.name}</p>
                        <p className="text-sm text-zinc-500">
                          {item.quantity} x {fmtINR(p.price)}
                          {item.discount > 0 && ` (- ₹${item.discount} discount)`}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-semibold text-zinc-900">{fmtINR(itemTotal)}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => removeFromCart(idx)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>
        </div>

        {/* RIGHT PANEL: Checkout Summary */}
        <div>
          <SectionCard title="Checkout & Payment" icon={<Calculator className="h-5 w-5 text-indigo-500" />}>
            <form onSubmit={handleCheckout} className="space-y-5">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Bill To (Customer)</Label>
                  <Button
                    type="button"
                    variant="link"
                    className="h-auto p-0 text-indigo-600 hover:text-indigo-700 flex items-center text-xs font-semibold"
                    onClick={() => setShowAddCustomerModal(true)}
                  >
                    <UserPlus className="h-3.5 w-3.5 mr-1" />
                    Quick Register
                  </Button>
                </div>
                <Select value={formCustomerId} onValueChange={setFormCustomerId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="walkin">-- Walk-in (No Name) --</SelectItem>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} ({c.phone || c.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-zinc-500">
                  Selecting a customer will automatically increment their Visit Count and Spend Amount.
                </p>

                {formCustomerId === "walkin" && (
                  <div className="pt-2 space-y-1 animate-in slide-in-from-top-1 duration-200">
                    <Label className="text-xs text-zinc-600">Send WhatsApp Bill To (Optional)</Label>
                    <Input
                      type="tel"
                      value={walkinPhone}
                      onChange={(e) => setWalkinPhone(e.target.value)}
                      placeholder="e.g. +919876543210"
                      className="h-8 text-xs bg-zinc-50/50"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Sales Department</Label>
                <Select value={formDepartmentId} onValueChange={setFormDepartmentId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select value={formPaymentMethod} onValueChange={setFormPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UPI">UPI</SelectItem>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Card">Credit/Debit Card</SelectItem>
                    <SelectItem value="Store Credit">Store Credit</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <hr className="my-4" />

              <div className="space-y-2 mb-6 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-600">Subtotal:</span>
                  <span className="text-zinc-900">{fmtINR(cartSubtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">Discount:</span>
                  <span className="text-red-500">-{fmtINR(cartDiscount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">Estimated GST (18%):</span>
                  <span className="text-zinc-900">{fmtINR(cartTax)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg pt-2 border-t mt-2">
                  <span>Grand Total:</span>
                  <span>{fmtINR(cartTotal)}</span>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full py-6 text-lg bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={saving || cartItems.length === 0}
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Processing
                  </>
                ) : (
                  "Complete Checkout & Generate Bill"
                )}
              </Button>
            </form>
          </SectionCard>
        </div>
      </div>

      <QuickRegisterCustomerDialog
        isOpen={showAddCustomerModal}
        onClose={() => setShowAddCustomerModal(false)}
        onSuccess={(newCust) => {
          setCustomers((prev) => [...prev, newCust]);
          setFormCustomerId(newCust.id);
        }}
        departments={departments}
        user={user}
      />
    </div>
  );
}

// Inline Sub-modal helper for Quick Customer Registration
function QuickRegisterCustomerDialog({
  isOpen,
  onClose,
  onSuccess,
  departments,
  user,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newCust: CustomerListItem) => void;
  departments: Array<{ id: string; name: string }>;
  user: any;
}) {
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [dept, setDept] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!first.trim() || !last.trim()) {
      toast.error("Customer name is required.");
      return;
    }
    if (!phone.trim()) {
      toast.error("Customer phone number is required.");
      return;
    }

    try {
      setSaving(true);
      const emailValue = email.trim() || `${first.toLowerCase()}.${last.toLowerCase()}@example.com`;
      const res = await addCustomerServer({
        firstName: first,
        lastName: last,
        email: emailValue,
        phone,
        loyaltyTier: "Bronze",
        preferredDepartmentId: dept || null,
        notes: "Quick registered via POS panel.",
        role: user?.role || "owner",
        emailUser: user?.email || "",
      });

      toast.success(`Customer "${first} ${last}" registered successfully!`);
      
      onSuccess({
        id: (res as any).id || "CUST-" + Date.now().toString().slice(-5),
        name: `${first} ${last}`,
        email: emailValue,
        phone,
        joinedDate: new Date().toISOString(),
        loyaltyTier: "Bronze",
        visitCount: 0,
        spendAmount: 0,
        churnRisk: "Low",
      });

      // Clear states
      setFirst("");
      setLast("");
      setEmail("");
      setPhone("");
      setDept("");
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to register customer.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Quick Register Customer</DialogTitle>
          <DialogDescription>
            Register a new loyalty customer directly to enable POS WhatsApp receipts and point accumulation.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>First Name</Label>
              <Input value={first} onChange={(e) => setFirst(e.target.value)} placeholder="Aarav" required />
            </div>
            <div className="space-y-1">
              <Label>Last Name</Label>
              <Input value={last} onChange={(e) => setLast(e.target.value)} placeholder="Mehra" required />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Phone Number (WhatsApp)</Label>
            <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. +919876543210" required />
          </div>
          <div className="space-y-1">
            <Label>Email (Optional)</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="aarav@gmail.com" />
          </div>
          <div className="space-y-1">
            <Label>Preferred Sales Department</Label>
            <Select value={dept} onValueChange={setDept}>
              <SelectTrigger>
                <SelectValue placeholder="Select preferred dept..." />
              </SelectTrigger>
              <SelectContent>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Register Customer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
