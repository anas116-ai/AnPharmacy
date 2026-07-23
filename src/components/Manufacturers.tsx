import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/authStore';
import { 
  Factory, Plus, Search, MoreVertical, Edit, Trash2, 
  Phone, Mail, MapPin, Star, FileText
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Select, SelectItem } from './ui/select';
import { useToast } from '../hooks/useToast';
import { cn } from '../lib/utils';

interface Manufacturer {
  id: number;
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  gstin: string | null;
  license_number: string | null;
  rating: number;
  notes: string | null;
  created_at: string;
}

export default function Manufacturers() {
  const { t } = useTranslation();
  const { hasPermission } = useAuthStore();
  const toast = useToast();
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editingManufacturer, setEditingManufacturer] = useState<Manufacturer | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    gstin: '',
    license_number: '',
    rating: 0,
    notes: '',
  });

  const canManage = hasPermission('manage_users');

  useEffect(() => {
    loadManufacturers();
  }, []);

  const loadManufacturers = async () => {
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.listManufacturers();
        if (result.success) {
          setManufacturers(result.manufacturers || []);
        }
      }
    } catch (error) {
      console.error('Failed to load manufacturers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!window.electronAPI || !canManage) return;

    try {
      const data = {
        ...formData,
        rating: parseInt(String(formData.rating)),
      };
      
      let result;
      if (editingManufacturer) {
        result = await window.electronAPI.updateManufacturer({ ...data, id: editingManufacturer.id });
      } else {
        result = await window.electronAPI.createManufacturer(data);
      }

      if (result.success) {
        toast.success(
          editingManufacturer ? 'Manufacturer updated' : 'Manufacturer created',
          `${formData.name} has been ${editingManufacturer ? 'updated' : 'added'} successfully.`
        );
        await loadManufacturers();
        handleCloseDialog();
      } else {
        toast.error('Error', result.error || 'Operation failed');
      }
    } catch (error) {
      toast.error('Error', 'An unexpected error occurred');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.electronAPI || !canManage) return;
    
    try {
      const result = await window.electronAPI.deleteManufacturer({ id });
      if (result.success) {
        toast.success('Manufacturer deleted', 'Manufacturer has been removed.');
        await loadManufacturers();
      } else {
        toast.error('Error', result.error || 'Failed to delete manufacturer');
      }
    } catch (error) {
      toast.error('Error', 'An unexpected error occurred');
    }
  };

  const handleEdit = (manufacturer: Manufacturer) => {
    setEditingManufacturer(manufacturer);
    setFormData({
      name: manufacturer.name,
      contact_person: manufacturer.contact_person || '',
      phone: manufacturer.phone || '',
      email: manufacturer.email || '',
      address: manufacturer.address || '',
      gstin: manufacturer.gstin || '',
      license_number: manufacturer.license_number || '',
      rating: manufacturer.rating,
      notes: manufacturer.notes || '',
    });
    setShowDialog(true);
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingManufacturer(null);
    setFormData({
      name: '',
      contact_person: '',
      phone: '',
      email: '',
      address: '',
      gstin: '',
      license_number: '',
      rating: 0,
      notes: '',
    });
  };

  const filteredManufacturers = manufacturers.filter(m =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.contact_person?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.phone?.includes(searchQuery)
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Manufacturers</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage manufacturer master data</p>
        </div>
        {canManage && (
          <Button onClick={() => setShowDialog(true)} size="sm" className="gap-2">
            <Plus className="w-4 h-4" />
            Add Manufacturer
          </Button>
        )}
      </div>

      {/* Search */}
      <Card variant="bordered">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search manufacturers..."
              className="pl-10 h-11"
            />
          </div>
        </CardContent>
      </Card>

      {/* Manufacturers List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton h-24 rounded-2xl" />
          ))}
        </div>
      ) : filteredManufacturers.length === 0 ? (
        <Card variant="bordered">
          <CardContent className="p-12 text-center">
            <Factory className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">No manufacturers found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredManufacturers.map((manufacturer) => (
            <Card key={manufacturer.id} variant="bordered" className="hover:shadow-medium transition-all duration-200">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center">
                      <Factory className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">{manufacturer.name}</h3>
                      <div className="flex items-center gap-1 mt-0.5">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={cn(
                              'w-3 h-3',
                              i < manufacturer.rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'
                            )}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  {canManage && (
                    <div className="relative group">
                      <button className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                        <MoreVertical className="w-4 h-4 text-gray-500" />
                      </button>
                      <div className="absolute right-0 mt-1 w-32 bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                        <button
                          onClick={() => handleEdit(manufacturer)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 rounded-t-lg"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(manufacturer.id)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-b-lg"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  {manufacturer.contact_person && (
                    <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                      <FileText className="w-3 h-3 text-gray-400" />
                      {manufacturer.contact_person}
                    </div>
                  )}
                  {manufacturer.phone && (
                    <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                      <Phone className="w-3 h-3 text-gray-400" />
                      {manufacturer.phone}
                    </div>
                  )}
                  {manufacturer.email && (
                    <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                      <Mail className="w-3 h-3 text-gray-400" />
                      {manufacturer.email}
                    </div>
                  )}
                  {manufacturer.address && (
                    <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                      <MapPin className="w-3 h-3 text-gray-400" />
                      {manufacturer.address}
                    </div>
                  )}
                </div>

                {manufacturer.gstin && (
                  <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-700">
                    <Badge variant="outline" size="sm">
                      GST: {manufacturer.gstin}
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingManufacturer ? 'Edit Manufacturer' : 'Add Manufacturer'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5">Manufacturer Name *</label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="h-11"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="contact_person" className="block text-sm font-medium text-gray-700 mb-1.5">Contact Person</label>
                <Input
                  id="contact_person"
                  value={formData.contact_person}
                  onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                  className="h-11"
                />
              </div>
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="h-11"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="h-11"
                />
              </div>
              <div>
                <label htmlFor="gstin" className="block text-sm font-medium text-gray-700 mb-1.5">GSTIN</label>
                <Input
                  id="gstin"
                  value={formData.gstin}
                  onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                  className="h-11"
                />
              </div>
            </div>
            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1.5">Address</label>
              <textarea
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                rows={2}
                className="w-full rounded-xl border border-gray-200 bg-white/80 px-4 py-2.5 text-sm transition-all duration-200 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="license_number" className="block text-sm font-medium text-gray-700 mb-1.5">License Number</label>
                <Input
                  id="license_number"
                  value={formData.license_number}
                  onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                  className="h-11"
                />
              </div>
              <div>
                <label htmlFor="rating" className="block text-sm font-medium text-gray-700 mb-1.5">Rating (0-5)</label>
                <Select
                  value={String(formData.rating)}
                  onValueChange={(value) => setFormData({ ...formData, rating: parseInt(value) })}
                >
                  {[0, 1, 2, 3, 4, 5].map(rating => (
                    <SelectItem key={rating} value={String(rating)}>
                      {rating} Star{rating !== 1 ? 's' : ''}
                    </SelectItem>
                  ))}
                </Select>
              </div>
            </div>
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
              <textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full rounded-xl border border-gray-200 bg-white/80 px-4 py-2.5 text-sm transition-all duration-200 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={!formData.name.trim()}>
                {editingManufacturer ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}