import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Search,
  Plus,
  Edit,
  Archive,
  Package as PkgIcon,
  AlertTriangle,
  TrendingUp,
  Loader2,
} from "lucide-react";
import { PageHeader, SectionCard, StatusPill } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useBusinessData } from "@/lib/business-context";
import { useAuth } from "@/lib/auth-context";
import { fmtINR, fmtNum } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import {
  getProductsServer,
  addProductServer,
  editProductServer,
  archiveProductServer,
  getProductOptionsServer,
  type ProductListItem,
} from "@/lib/server-products";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/products")({
  head: () => ({
    meta: [
      { title: "Product Intelligence — OmniMind AI" },
      {
        name: "description",
        content: "Product 360° intelligence with sales, demand, expiry, and reorder recommendations.",
      },
    ],
  }),
  component: Products,
});

function Products() {
  const { openProduct360 } = useBusinessData();
  const { user } = useAuth();

  // Search & Loading state
  const [q, setQ] = useState("");
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ProductListItem | null>(null);

  // Form lists
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);
  const [suppliers, setSuppliers] = useState<Array<{ id: string; name: string }>>([]);
  const [locations, setLocations] = useState<Array<{ id: string; name: string }>>([]);

  // Dialog open state
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Add Product form state
  const [formName, setFormName] = useState("");
  const [formSku, setFormSku] = useState("");
  const [formBarcode, setFormBarcode] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formDepartment, setFormDepartment] = useState("");
  const [formBrand, setFormBrand] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formSellingPrice, setFormSellingPrice] = useState("");
  const [formCostPrice, setFormCostPrice] = useState("");
  const [formTaxRate, setFormTaxRate] = useState("18.0");
  const [formUnit, setFormUnit] = useState("units");
  const [formReorderLevel, setFormReorderLevel] = useState("");
  const [formInitialStock, setFormInitialStock] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formSupplier, setFormSupplier] = useState("");
  const [formBatchNo, setFormBatchNo] = useState("");
  const [formMfgDate, setFormMfgDate] = useState("");
  const [formExpDate, setFormExpDate] = useState("");

  const loadProducts = async () => {
    setLoading(true);
    try {
      const list = await getProductsServer({
        data: {
          role: user?.role || "owner",
          email: user?.email || "",
        },
      });
      setProducts(list);
      if (list.length > 0) {
        setSelected(list[0]);
      } else {
        setSelected(null);
      }
    } catch (e) {
      toast.error("Failed to load products list from database.");
    } finally {
      setLoading(false);
    }
  };

  const loadOptions = async () => {
    try {
      const opts = await getProductOptionsServer({
        data: {
          role: user?.role || "owner",
          email: user?.email || "",
        },
      });
      setCategories(opts.categories);
      setDepartments(opts.departments);
      setSuppliers(opts.suppliers);
      setLocations(opts.locations);

      // Select default options
      if (opts.categories.length > 0) setFormCategory(opts.categories[0].id);
      if (opts.departments.length > 0) setFormDepartment(opts.departments[0].id);
      if (opts.suppliers.length > 0) setFormSupplier(opts.suppliers[0].id);
      if (opts.locations.length > 0) setFormLocation(opts.locations[0].id);
    } catch (e) {
      console.error("Failed to load form options", e);
    }
  };

  useEffect(() => {
    loadProducts();
    loadOptions();
  }, [user]);

  const resetForm = () => {
    setFormName("");
    setFormSku("");
    setFormBarcode("");
    setFormBrand("");
    setFormDesc("");
    setFormSellingPrice("");
    setFormCostPrice("");
    setFormTaxRate("18.0");
    setFormUnit("units");
    setFormReorderLevel("");
    setFormInitialStock("");
    setFormBatchNo("");
    setFormMfgDate("");
    setFormExpDate("");
    if (categories.length > 0) setFormCategory(categories[0].id);
    if (departments.length > 0) setFormDepartment(departments[0].id);
    if (suppliers.length > 0) setFormSupplier(suppliers[0].id);
    if (locations.length > 0) setFormLocation(locations[0].id);
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formSku || !formBarcode || !formSellingPrice || !formCostPrice || !formReorderLevel) {
      toast.error("Please fill in all required fields.");
      return;
    }
    setSaving(true);
    try {
      await addProductServer({
        data: {
          name: formName,
          sku: formSku,
          barcode: formBarcode,
          categoryId: formCategory,
          departmentId: formDepartment,
          brand: formBrand,
          description: formDesc,
          sellingPrice: Number(formSellingPrice),
          costPrice: Number(formCostPrice),
          taxRate: Number(formTaxRate),
          unit: formUnit,
          reorderLevel: Number(formReorderLevel),
          initialStock: Number(formInitialStock) || 0,
          locationId: formLocation,
          supplierId: formSupplier || undefined,
          batchNumber: formBatchNo || undefined,
          manufacturingDate: formMfgDate || undefined,
          expiryDate: formExpDate || undefined,
          role: user?.role || "owner",
          emailUser: user?.email || "",
        },
      });
      toast.success(`Successfully registered SKU ${formSku}`);
      setAddOpen(false);
      resetForm();
      loadProducts();
    } catch (err: any) {
      toast.error(err.message || "Failed to add product.");
    } finally {
      setSaving(false);
    }
  };

  const handleEditProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    if (!formName || !formSellingPrice || !formCostPrice || !formReorderLevel) {
      toast.error("Please fill in all required fields.");
      return;
    }
    setSaving(true);
    try {
      await editProductServer({
        data: {
          id: selected.id,
          name: formName,
          categoryId: formCategory,
          departmentId: formDepartment,
          brand: formBrand,
          description: formDesc,
          sellingPrice: Number(formSellingPrice),
          costPrice: Number(formCostPrice),
          taxRate: Number(formTaxRate),
          unit: formUnit,
          reorderLevel: Number(formReorderLevel),
          status: selected.status,
          role: user?.role || "owner",
          emailUser: user?.email || "",
        },
      });
      toast.success(`Successfully updated SKU ${selected.sku}`);
      setEditOpen(false);
      loadProducts();
    } catch (err: any) {
      toast.error(err.message || "Failed to update product.");
    } finally {
      setSaving(false);
    }
  };

  const handleArchiveProduct = async () => {
    if (!selected) return;
    if (!confirm(`Are you sure you want to archive product SKU ${selected.sku}?`)) return;
    try {
      await archiveProductServer({
        data: {
          id: selected.id,
          role: user?.role || "owner",
          emailUser: user?.email || "",
        },
      });
      toast.success("Product archived successfully.");
      loadProducts();
    } catch (err: any) {
      toast.error(err.message || "Failed to archive product.");
    }
  };

  const openEditDialog = () => {
    if (!selected) return;
    setFormName(selected.name);
    setFormCategory(selected.categoryId);
    setFormDepartment(selected.departmentId);
    setFormBrand(selected.brand);
    setFormDesc(selected.description || "");
    setFormSellingPrice(selected.price.toString());
    setFormCostPrice(selected.cost.toString());
    setFormUnit(selected.unit);
    setFormReorderLevel(selected.reorder.toString());
    setEditOpen(true);
  };

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(q.toLowerCase()) ||
      p.sku.toLowerCase().includes(q.toLowerCase()) ||
      p.dept.toLowerCase().includes(q.toLowerCase()),
  );

  const lowStockCount = products.filter((p) => p.stock <= p.reorder).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Product Intelligence"
        subtitle="Deep visibility into every SKU: sales, demand, expiry, margins, and AI recommendations."
        actions={
          <Button
            onClick={() => {
              resetForm();
              setAddOpen(true);
            }}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold flex items-center gap-2"
          >
            <Plus className="h-4 w-4" /> Add Product
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MiniKpi
          label="Total active SKUs"
          value={fmtNum(products.length)}
          icon={<PkgIcon className="h-4 w-4" />}
        />
        <MiniKpi
          label="Total Stock Value"
          value={fmtINR(products.reduce((sum, p) => sum + p.stock * p.cost, 0), { compact: true })}
          tone="success"
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <MiniKpi
          label="Low Stock Alert"
          value={fmtNum(lowStockCount)}
          tone={lowStockCount > 0 ? "warning" : undefined}
          icon={<AlertTriangle className="h-4 w-4" />}
        />
        <MiniKpi
          label="Fashion Contribution"
          value={fmtINR(products.filter(p => p.dept === "Fashion").reduce((sum, p) => sum + p.stock * p.price, 0), { compact: true })}
          icon={<TrendingUp className="h-4 w-4" />}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.5fr)_1fr]">
        <SectionCard
          title="All Products"
          subtitle={`${filtered.length} of ${products.length} active SKUs`}
          actions={
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search SKU, name, department…"
                className="h-8 w-64 bg-sidebar border border-hairline pl-8 text-xs focus:border-primary/50"
              />
            </div>
          }
        >
          <div className="overflow-x-auto min-h-[300px] relative">
            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center bg-sidebar/50">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                No matching product records found in database.
              </div>
            ) : (
              <table className="w-full min-w-[860px] text-xs">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground border-b border-hairline">
                    <th className="pb-2 font-medium">Product</th>
                    <th className="pb-2 font-medium">Dept</th>
                    <th className="pb-2 text-right font-medium">Price</th>
                    <th className="pb-2 text-right font-medium">Stock</th>
                    <th className="pb-2 text-right font-medium">Margin</th>
                    <th className="pb-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {filtered.map((p) => (
                    <tr
                      key={p.id}
                      className={cn(
                        "cursor-pointer transition-colors hover:bg-surface/50",
                        selected?.id === p.id && "bg-primary/10",
                      )}
                      onClick={() => setSelected(p)}
                    >
                      <td className="py-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-surface text-[10px] font-semibold text-muted-foreground">
                            {p.brand.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-foreground">{p.name}</p>
                            <p className="truncate text-[10px] text-muted-foreground">
                              {p.sku} · {p.brand}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 text-muted-foreground">{p.dept}</td>
                      <td className="py-2.5 text-right font-medium">{fmtINR(p.price)}</td>
                      <td className="py-2.5 text-right">
                        <span
                          className={cn(
                            p.stock === 0
                              ? "text-destructive font-bold"
                              : p.stock <= p.reorder
                                ? "text-warning font-semibold"
                                : "",
                          )}
                        >
                          {fmtNum(p.stock)} {p.unit}
                        </span>
                      </td>
                      <td className="py-2.5 text-right text-success">{p.margin}%</td>
                      <td className="py-2.5">
                        <StatusPill tone={p.stock === 0 ? "danger" : p.stock <= p.reorder ? "warning" : "success"}>
                          {p.stock === 0 ? "out of stock" : p.stock <= p.reorder ? "low stock" : p.status}
                        </StatusPill>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </SectionCard>

        {selected && (
          <Product360View
            p={selected}
            onEdit={openEditDialog}
            onArchive={handleArchiveProduct}
            onOpen360={openProduct360}
          />
        )}
      </div>

      {/* Add Product Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-[500px] bg-sidebar border border-hairline text-foreground overflow-y-auto max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>Register New SKU</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddProduct} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="add-name">Product Name *</Label>
                <Input
                  id="add-name"
                  required
                  className="bg-surface border-hairline h-8 text-xs"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="add-brand">Brand Name *</Label>
                <Input
                  id="add-brand"
                  required
                  className="bg-surface border-hairline h-8 text-xs"
                  value={formBrand}
                  onChange={(e) => setFormBrand(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="add-sku">Product SKU (Code) *</Label>
                <Input
                  id="add-sku"
                  required
                  placeholder="e.g. SKU-10021"
                  className="bg-surface border-hairline h-8 text-xs"
                  value={formSku}
                  onChange={(e) => setFormSku(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="add-barcode">Product Barcode *</Label>
                <Input
                  id="add-barcode"
                  required
                  placeholder="e.g. BAR-10021"
                  className="bg-surface border-hairline h-8 text-xs"
                  value={formBarcode}
                  onChange={(e) => setFormBarcode(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Category *</Label>
                <Select value={formCategory} onValueChange={setFormCategory}>
                  <SelectTrigger className="bg-surface border-hairline h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-hairline text-xs">
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Department *</Label>
                <Select value={formDepartment} onValueChange={setFormDepartment}>
                  <SelectTrigger className="bg-surface border-hairline h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-hairline text-xs">
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="add-sellprice">Retail Price (₹) *</Label>
                <Input
                  id="add-sellprice"
                  type="number"
                  required
                  className="bg-surface border-hairline h-8 text-xs"
                  value={formSellingPrice}
                  onChange={(e) => setFormSellingPrice(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="add-costprice">Cost Price (₹) *</Label>
                <Input
                  id="add-costprice"
                  type="number"
                  required
                  className="bg-surface border-hairline h-8 text-xs"
                  value={formCostPrice}
                  onChange={(e) => setFormCostPrice(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="add-unit">Unit Type</Label>
                <Input
                  id="add-unit"
                  placeholder="units, kg, packets..."
                  className="bg-surface border-hairline h-8 text-xs"
                  value={formUnit}
                  onChange={(e) => setFormUnit(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 border-t border-hairline pt-3">
              <div className="space-y-1.5">
                <Label htmlFor="add-initstock">Initial Stock *</Label>
                <Input
                  id="add-initstock"
                  type="number"
                  placeholder="0"
                  className="bg-surface border-hairline h-8 text-xs"
                  value={formInitialStock}
                  onChange={(e) => setFormInitialStock(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Stock Location</Label>
                <Select value={formLocation} onValueChange={setFormLocation}>
                  <SelectTrigger className="bg-surface border-hairline h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-hairline text-xs">
                    {locations.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="add-reorder">Reorder Threshold *</Label>
                <Input
                  id="add-reorder"
                  type="number"
                  className="bg-surface border-hairline h-8 text-xs"
                  value={formReorderLevel}
                  onChange={(e) => setFormReorderLevel(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 border-t border-hairline pt-3">
              <div className="space-y-1.5">
                <Label>Preferred Supplier</Label>
                <Select value={formSupplier} onValueChange={setFormSupplier}>
                  <SelectTrigger className="bg-surface border-hairline h-8 text-xs">
                    <SelectValue placeholder="Select Supplier" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-hairline text-xs">
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="add-batchno">Batch Number</Label>
                <Input
                  id="add-batchno"
                  placeholder="e.g. B-01"
                  className="bg-surface border-hairline h-8 text-xs"
                  value={formBatchNo}
                  onChange={(e) => setFormBatchNo(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="add-mfg">Mfg Date</Label>
                <Input
                  id="add-mfg"
                  type="date"
                  className="bg-surface border-hairline h-8 text-xs"
                  value={formMfgDate}
                  onChange={(e) => setFormMfgDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="add-exp">Expiry Date</Label>
                <Input
                  id="add-exp"
                  type="date"
                  className="bg-surface border-hairline h-8 text-xs"
                  value={formExpDate}
                  onChange={(e) => setFormExpDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="add-desc">Description</Label>
              <Textarea
                id="add-desc"
                className="bg-surface border-hairline text-xs"
                rows={2}
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Save Product
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Product Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[425px] bg-sidebar border border-hairline text-foreground">
          <DialogHeader>
            <DialogTitle>Edit Product Details</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditProduct} className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <Label htmlFor="edit-name">Product Name *</Label>
              <Input
                id="edit-name"
                required
                className="bg-surface border-hairline h-8 text-xs"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Category *</Label>
                <Select value={formCategory} onValueChange={setFormCategory}>
                  <SelectTrigger className="bg-surface border-hairline h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-hairline text-xs">
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Department *</Label>
                <Select value={formDepartment} onValueChange={setFormDepartment}>
                  <SelectTrigger className="bg-surface border-hairline h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-hairline text-xs">
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-sellprice">Retail Price (₹) *</Label>
                <Input
                  id="edit-sellprice"
                  type="number"
                  required
                  className="bg-surface border-hairline h-8 text-xs"
                  value={formSellingPrice}
                  onChange={(e) => setFormSellingPrice(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-costprice">Cost Price (₹) *</Label>
                <Input
                  id="edit-costprice"
                  type="number"
                  required
                  className="bg-surface border-hairline h-8 text-xs"
                  value={formCostPrice}
                  onChange={(e) => setFormCostPrice(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-reorder">Reorder Threshold *</Label>
                <Input
                  id="edit-reorder"
                  type="number"
                  required
                  className="bg-surface border-hairline h-8 text-xs"
                  value={formReorderLevel}
                  onChange={(e) => setFormReorderLevel(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-unit">Unit Type</Label>
                <Input
                  id="edit-unit"
                  className="bg-surface border-hairline h-8 text-xs"
                  value={formUnit}
                  onChange={(e) => setFormUnit(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-desc">Description</Label>
              <Textarea
                id="edit-desc"
                className="bg-surface border-hairline text-xs"
                rows={2}
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MiniKpi({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  tone?: "warning" | "success";
}) {
  return (
    <div className="card-elevated p-3.5">
      <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
        {icon && (
          <span className={tone === "warning" ? "text-warning" : "text-primary"}>{icon}</span>
        )}
      </div>
      <p
        className={cn(
          "mt-2 font-display text-xl font-semibold",
          tone === "success" && "text-success",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function Product360View({
  p,
  onEdit,
  onArchive,
  onOpen360,
}: {
  p: ProductListItem;
  onEdit: () => void;
  onArchive: () => void;
  onOpen360: (id: string) => void;
}) {
  // Simple stockout indicator based on current items
  const daysLeft = p.stock === 0 ? 0 : Math.round(p.stock / 2.5 + 1);

  return (
    <div className="space-y-4">
      <SectionCard
        title="Product Snapshot"
        subtitle={p.name}
        actions={
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="border-hairline bg-surface text-xs font-semibold text-primary hover:bg-primary/10"
              onClick={onEdit}
            >
              <Edit className="h-3 w-3 mr-1" /> Edit
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-hairline bg-surface text-xs font-semibold text-destructive hover:bg-destructive/10"
              onClick={onArchive}
            >
              <Archive className="h-3 w-3 mr-1" /> Archive
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-hairline bg-surface text-xs font-semibold"
              onClick={() => onOpen360(p.id)}
            >
              360° Profile
            </Button>
          </div>
        }
      >
        <div className="flex items-start gap-3 mt-2">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-lg gradient-primary text-sm font-bold text-primary-foreground">
            {p.brand.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {p.dept} · {p.category}
            </p>
            <h3 className="mt-0.5 truncate font-display text-lg font-semibold">{p.name}</h3>
            <p className="text-xs text-muted-foreground">
              SKU: {p.sku} · Barcode: {p.barcode} · Brand: {p.brand}
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <Stat label="Selling Price" v={fmtINR(p.price)} />
          <Stat label="Cost Price" v={fmtINR(p.cost)} />
          <Stat label="Gross Margin" v={`${p.margin}%`} tone="success" />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <Stat label="Current stock" v={`${fmtNum(p.stock)} ${p.unit}`} />
          <Stat label="Reorder level" v={`${fmtNum(p.reorder)} ${p.unit}`} />
        </div>

        <div className="mt-3 rounded-md border border-primary/30 bg-primary/5 p-3 text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-primary">
            <AlertTriangle className="h-3.5 w-3.5" /> Quick Inventory Status
          </div>
          <p className="mt-1 text-foreground/90 leading-relaxed">
            {p.stock === 0 ? (
              <span className="text-destructive font-semibold">SKU is currently out of stock. Customers cannot checkout this product.</span>
            ) : p.stock <= p.reorder ? (
              <span className="text-warning font-semibold">Current stock is below reorder threshold. Projected stockout in {daysLeft} days. We recommend ordering immediately.</span>
            ) : (
              <span>Inventory is within safe levels. Estimated buffer: {daysLeft} days of sales operations.</span>
            )}
          </p>
        </div>
      </SectionCard>
    </div>
  );
}

function Stat({ label, v, tone }: { label: string; v: string; tone?: "success" }) {
  return (
    <div className="rounded-md border border-hairline bg-surface/60 p-2">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn("mt-0.5 font-semibold", tone === "success" && "text-success")}>{v}</p>
    </div>
  );
}
