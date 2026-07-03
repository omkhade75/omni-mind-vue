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
import { getProductsServer, getProductOptionsServer, type ProductListItem } from "@/lib/server-products";
import { getCustomersServer, type CustomerListItem } from "@/lib/server-customers";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, FileText, CheckCircle2, ShoppingCart, Calculator } from "lucide-react";
import { fmtINR } from "@/lib/mock-data";

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

  // Data states
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);

  // Form values
  const [formCustomerId, setFormCustomerId] = useState<string>("walkin");
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

  const addToCart = () => {
    if (!selectedItemSku || Number(selectedItemQty) <= 0) return;
    
    const existingIndex = cartItems.findIndex(i => i.productId === selectedItemSku);
    if (existingIndex > -1) {
      const updated = [...cartItems];
      updated[existingIndex].quantity += Number(selectedItemQty);
      setCartItems(updated);
    } else {
      setCartItems([...cartItems, {
        productId: selectedItemSku,
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
          departmentId: formDepartmentId,
          items: cartItems,
          paymentMethod: formPaymentMethod,
          role: user?.role || "owner",
          emailUser: user?.email || "",
        }
      };
      // Use any for response to bypass strict typing if it returns transaction ID etc
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
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[200px]">
                <Label className="mb-1 block">Select Product SKU / Name</Label>
                <Select value={selectedItemSku} onValueChange={setSelectedItemSku}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a product..." />
                  </SelectTrigger>
                  <SelectContent>
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
              <Button onClick={addToCart} className="bg-indigo-600 hover:bg-indigo-700">
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
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
                <Label>Bill To (Customer)</Label>
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
    </div>
  );
}
