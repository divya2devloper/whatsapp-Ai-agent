import { useEffect, useState, useRef } from 'react';
import { Building2, Plus, Pencil, Trash2, ExternalLink, X, Check, Upload, Eye, User, Phone, Tag, Download, ImageIcon, Film } from 'lucide-react';
import { getProperties, createProperty, updateProperty, deleteProperty, importProperties, exportProperties, downloadBlob } from '../api/client';
import Skeleton from '../components/Skeleton';

const EMPTY_FORM = {
  location: '',
  url: '',
  description: '',
  property_type: '',
  price_range: '',
  owner_name: '',
  owner_number: '',
  listing_status: 'Active',
  images: [], // Existing URLs
  video_url: '', // Existing URL
  is_active: true,
};

export default function Properties() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [newFiles, setNewFiles] = useState([]); // Array of File objects for images
  const [newVideoFile, setNewVideoFile] = useState(null); // Single File object for video
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);

  function load() {
    setLoading(true);
    getProperties()
      .then((r) => setProperties(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  function openAdd() {
    setEditId(null);
    setForm(EMPTY_FORM);
    setNewFiles([]);
    setNewVideoFile(null);
    setError('');
    setShowForm(true);
  }

  function openEdit(p) {
    setEditId(p.id);
    setForm({
      location: p.location,
      url: p.url || '',
      description: p.description || '',
      property_type: p.property_type || '',
      price_range: p.price_range || '',
      owner_name: p.owner_name || '',
      owner_number: p.owner_number || '',
      listing_status: p.listing_status || 'Active',
      images: Array.isArray(p.images) ? p.images : [],
      video_url: p.video_url || '',
      is_active: Boolean(p.is_active),
    });
    setNewFiles([]);
    setNewVideoFile(null);
    setError('');
    setShowForm(true);
  }

  function openDetail(p) {
    setSelectedProperty(p);
    setShowDetail(true);
  }

  async function handleSave() {
    if (!form.location.trim()) {
      setError('Location is required');
      return;
    }
    setSaving(true);
    setError('');

    try {
      const formData = new FormData();
      // Append all text fields
      Object.keys(form).forEach(key => {
        if (key === 'images') {
          formData.append('existing_images', JSON.stringify(form.images));
        } else {
          formData.append(key, form[key] === '' ? '' : form[key]);
        }
      });

      // Append new image files
      newFiles.forEach(file => {
        formData.append('images', file);
      });

      // Append new video file
      if (newVideoFile) {
        formData.append('video', newVideoFile);
      }

      if (editId) {
        await updateProperty(editId, formData);
      } else {
        await createProperty(formData);
      }
      setShowForm(false);
      load();
    } catch (e) {
      console.error(e);
      let errorMsg = 'Save failed. Please check the console.';
      if (e.response?.data?.error) {
         errorMsg = e.response.data.error;
      } else if (e.response?.data?.errors?.[0]?.msg) {
         errorMsg = e.response.data.errors[0].msg;
      } else if (e.message) {
         errorMsg = e.message;
      }
      setError(errorMsg);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this property?')) return;
    await deleteProperty(id);
    load();
  }

  async function toggleActive(p) {
    const formData = new FormData();
    formData.append('is_active', !p.is_active);
    await updateProperty(p.id, formData);
    load();
  }

  async function handleExport() {
    try {
      const res = await exportProperties();
      downloadBlob(res.data, 'properties.xlsx');
    } catch (e) {
      alert('Export failed');
    }
  }

  async function handleImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError('');
    try {
      await importProperties(file);
      load();
      alert('Import successful');
    } catch (e) {
      alert('Import failed: ' + (e.response?.data?.error || e.message));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (newFiles.length + files.length > 10) {
      alert('Maximum 10 images allowed');
      return;
    }
    setNewFiles([...newFiles, ...files]);
  };

  const handleVideoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      // 20MB limit for video (just a suggestion/common practice)
      if (file.size > 20 * 1024 * 1024) {
        alert('Video size should be under 20MB');
        return;
      }
      setNewVideoFile(file);
    }
  };

  const removeNewFile = (index) => {
    setNewFiles(newFiles.filter((_, i) => i !== index));
  };

  const removeExistingImage = (index) => {
    setForm({ ...form, images: form.images.filter((_, i) => i !== index) });
  };

  return (
    <>
      <div className="p-8 animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Properties</h1>
            <p className="text-gray-500 text-sm mt-1">Manage property listings and owner details</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImport}
              accept=".xlsx,.xls"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              {uploading ? 'Importing...' : 'Import Excel'}
            </button>
            <button
              onClick={openAdd}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              Add Property
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 bg-gray-50 border-b border-gray-100 text-[11px] font-bold uppercase tracking-wider">
                <th className="px-4 py-3 text-gray-900">Property</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3 text-center">Media</th>
                <th className="px-4 py-3 text-center">Web Status</th>
                <th className="px-4 py-3">Listing Status</th>
                <th className="px-6 py-3 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Skeleton className="w-10 h-10 rounded-lg flex-shrink-0" />
                        <div>
                          <Skeleton className="h-4 w-28 mb-1" />
                          <Skeleton className="h-3 w-20" />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                    <td className="px-4 py-3 text-gray-800 font-bold"><Skeleton className="h-4 w-20" /></td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5 mx-auto">
                        <Skeleton className="w-3.5 h-3.5 rounded-sm" />
                      </div>
                    </td>
                     <td className="px-4 py-3 text-center">
                      <Skeleton className="h-6 w-16 rounded-full mx-auto" />
                    </td>
                    <td className="px-4 py-3">
                       <Skeleton className="h-6 w-16 rounded-full" />
                    </td>
                    <td className="px-4 py-3">
                      <Skeleton className="h-8 w-8 rounded-lg ml-auto" />
                    </td>
                  </tr>
                ))
              ) : properties.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-16 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center">
                      <Building2 className="w-10 h-10 mb-3" />
                      <p>No properties yet. Add your first listing.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                properties.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden border border-gray-200 group-hover:scale-110 transition-transform">
                          {p.images?.[0] ? (
                            <img src={p.images[0]} alt="" className="w-full h-full object-cover" />
                          ) : p.video_url ? (
                             <div className="w-full h-full flex items-center justify-center bg-indigo-50">
                               <Film className="w-5 h-5 text-indigo-300" />
                             </div>
                          ) : (
                            <Building2 className="w-5 h-5 text-gray-300 m-2.5" />
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-gray-800">{p.location}</p>
                          <p className="text-xs text-gray-400 truncate max-w-[150px]">{p.owner_name || 'No owner name'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 font-medium">{p.property_type || '—'}</td>
                    <td className="px-4 py-3 text-gray-800 font-bold">{p.price_range || '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {p.images?.length > 0 && <ImageIcon className="w-3.5 h-3.5 text-gray-400" title={`${p.images.length} images`} />}
                        {p.video_url && <Film className="w-3.5 h-3.5 text-indigo-400" title="Video available" />}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button 
                        onClick={() => toggleActive(p)} 
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors border ${
                          p.is_active 
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100' 
                            : 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        {p.is_active ? 'Online' : 'Offline'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                          p.listing_status === 'Active' 
                            ? 'bg-blue-50 text-blue-600 border-blue-100' 
                            : p.listing_status === 'Sold'
                            ? 'bg-orange-50 text-orange-600 border-orange-100'
                            : 'bg-gray-50 text-gray-400 border-gray-100'
                        }`}>
                        {p.listing_status || 'Active'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openDetail(p)}
                          className="p-1.5 hover:bg-gray-100 rounded text-blue-600"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEdit(p)}
                          className="p-1.5 hover:bg-gray-100 rounded text-gray-500"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="p-1.5 hover:bg-red-50 rounded text-red-400"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-start z-50 p-4 overflow-y-auto custom-scrollbar backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-8 flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white sticky top-0 z-10">
              <h2 className="font-semibold text-gray-700">
                {editId ? 'Edit Property' : 'Add Property'}
              </h2>
              <button onClick={() => setShowForm(false)}>
                <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {error && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg border border-red-100">{error}</p>}
              
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-xs text-gray-500 block mb-1 font-bold">Location *</label>
                  <input
                    type="text"
                    placeholder="e.g. Bandra West, Mumbai"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>
                
                <div className="col-span-2">
                  <label className="text-xs text-gray-500 block mb-1">Listing URL (Optional)</label>
                  <input
                    type="url"
                    placeholder="https://yoursite.com/bandra"
                    value={form.url}
                    onChange={(e) => setForm({ ...form, url: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-500 block mb-1">Owner Name</label>
                  <input
                    type="text"
                    placeholder="Owner Name"
                    value={form.owner_name}
                    onChange={(e) => setForm({ ...form, owner_name: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Owner Number</label>
                  <input
                    type="text"
                    placeholder="Owner Number"
                    value={form.owner_number}
                    onChange={(e) => setForm({ ...form, owner_number: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-500 block mb-1">Property Type</label>
                  <input
                    type="text"
                    placeholder="2BHK / Villa / Plot"
                    value={form.property_type}
                    onChange={(e) => setForm({ ...form, property_type: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Price Range</label>
                  <input
                    type="text"
                    placeholder="₹50L – ₹1Cr"
                    value={form.price_range}
                    onChange={(e) => setForm({ ...form, price_range: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-500 block mb-1">Listing Status</label>
                  <select
                    value={form.listing_status}
                    onChange={(e) => setForm({ ...form, listing_status: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Sold">Sold</option>
                  </select>
                </div>
                <div className="flex items-end pb-1.5">
                   <label className="flex items-center gap-2 text-sm cursor-pointer p-1 hover:bg-gray-50 rounded-lg transition-colors">
                    <input
                      type="checkbox"
                      checked={form.is_active}
                      onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-gray-700 font-medium select-none">Show on Web</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500 block mb-1">Description</label>
                <textarea
                  placeholder="e.g. 2BHK flats from ₹60L in prime location..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* Image Upload Section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-gray-500 font-bold uppercase tracking-wider">Images (Max 10)</label>
                  <button 
                    onClick={() => imageInputRef.current?.click()}
                    disabled={form.images.length + newFiles.length >= 10}
                    type="button"
                    className="flex items-center gap-1 text-[11px] text-blue-600 font-bold hover:underline disabled:opacity-50"
                  >
                    <ImageIcon className="w-3 h-3" />
                    Add Images
                  </button>
                  <input
                    type="file"
                    ref={imageInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    multiple
                    className="hidden"
                  />
                </div>
                
                <div className="grid grid-cols-5 gap-2">
                  {/* Existing Images */}
                  {form.images.map((img, idx) => (
                    <div key={`old-${idx}`} className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden border border-gray-200 group">
                      <img src={img} alt="" className="w-full h-full object-cover" />
                      <button 
                        onClick={() => removeExistingImage(idx)}
                        className="absolute top-1 right-1 p-0.5 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  
                  {/* New Image Files */}
                  {newFiles.map((file, idx) => (
                    <div key={`new-${idx}`} className="relative aspect-square bg-blue-50 rounded-lg overflow-hidden border border-blue-200 group">
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-6 h-6 text-blue-300" />
                      </div>
                      <div className="absolute inset-0 bg-blue-600/10 flex items-end p-1">
                        <p className="text-[8px] text-blue-700 truncate font-bold">{file.name}</p>
                      </div>
                      <button 
                        onClick={() => removeNewFile(idx)}
                        className="absolute top-1 right-1 p-0.5 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}

                  {/* Placeholder for empty image slots */}
                  {Array.from({ length: Math.max(0, 10 - form.images.length - newFiles.length) }).map((_, i) => (
                    <button
                      key={`empty-${i}`}
                      onClick={() => imageInputRef.current?.click()}
                      className="aspect-square bg-gray-50 border border-dashed border-gray-200 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors"
                    >
                      <Plus className="w-4 h-4 text-gray-300" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Video Upload Section */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-gray-500 font-bold uppercase tracking-wider">Video (Max 1)</label>
                  {!newVideoFile && !form.video_url && (
                    <button 
                      onClick={() => videoInputRef.current?.click()}
                      type="button"
                      className="flex items-center gap-1 text-[11px] text-indigo-600 font-bold hover:underline"
                    >
                      <Film className="w-3 h-3" />
                      Upload Video
                    </button>
                  )}
                  <input
                    type="file"
                    ref={videoInputRef}
                    onChange={handleVideoChange}
                    accept="video/*"
                    className="hidden"
                  />
                </div>
                
                {newVideoFile ? (
                  <div className="flex items-center justify-between p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-indigo-100 rounded-lg">
                        <Film className="w-4 h-4 text-indigo-600" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-indigo-800 truncate max-w-[200px]">{newVideoFile.name}</p>
                        <p className="text-[10px] text-indigo-500">New Video Ready</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setNewVideoFile(null)}
                      className="p-1 text-indigo-400 hover:text-indigo-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : form.video_url ? (
                  <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-emerald-100 rounded-lg">
                        <Film className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-emerald-800">Video Uploaded</p>
                        <a href={form.video_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-emerald-500 hover:underline">View Current Video</a>
                      </div>
                    </div>
                    <button 
                      onClick={() => setForm({ ...form, video_url: '' })}
                      className="p-1 text-emerald-400 hover:text-emerald-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => videoInputRef.current?.click()}
                    className="w-full py-4 border border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center text-gray-300 hover:bg-gray-50 transition-colors"
                  >
                    <Film className="w-6 h-6 mb-1" />
                    <p className="text-[10px] font-bold uppercase tracking-wider">No Video Selected</p>
                  </button>
                )}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 text-sm bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-all shadow-lg shadow-blue-100"
              >
                {saving ? (
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving...
                  </div>
                ) : 'Save Property'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetail && selectedProperty && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="relative h-64 bg-gray-100">
              {/* Media Gallery (Images + Video) */}
              <div className="flex w-full h-full overflow-x-auto snap-x scrollbar-hide">
                {/* Video at the start if available */}
                {selectedProperty.video_url && (
                   <div className="w-full h-full flex-shrink-0 snap-center relative bg-black">
                     <video 
                       src={selectedProperty.video_url} 
                       controls 
                       className="w-full h-full object-contain"
                     />
                     <div className="absolute top-4 left-4 p-1.5 bg-indigo-600 text-white rounded-lg shadow-lg">
                        <Film className="w-4 h-4" />
                     </div>
                   </div>
                )}
                {/* Images */}
                {selectedProperty.images && selectedProperty.images.length > 0 ? (
                  selectedProperty.images.map((img, idx) => (
                    <img 
                      key={idx} 
                      src={img} 
                      alt="" 
                      className="w-full h-full object-cover flex-shrink-0 snap-center" 
                    />
                  ))
                ) : !selectedProperty.video_url && (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-blue-50 text-blue-200">
                    <Building2 className="w-16 h-16" />
                    <p className="text-[10px] font-bold uppercase tracking-widest mt-2">No Media</p>
                  </div>
                )}
              </div>
              
              <button 
                onClick={() => setShowDetail(false)}
                className="absolute top-4 right-4 p-2 bg-black/40 hover:bg-black/60 text-white rounded-full transition-colors backdrop-blur-md z-10"
              >
                <X className="w-4 h-4" />
              </button>
              
              <div className="absolute top-4 left-4 flex gap-2 z-10">
                {selectedProperty.listing_status && (
                  <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm border ${
                    selectedProperty.listing_status === 'Active' ? 'bg-emerald-500 text-white border-emerald-400' : 
                    selectedProperty.listing_status === 'Sold' ? 'bg-orange-500 text-white border-orange-400' : 'bg-gray-500 text-white border-gray-400'
                  }`}>
                    {selectedProperty.listing_status}
                  </div>
                )}
                {(selectedProperty.images?.length + (selectedProperty.video_url ? 1 : 0)) > 1 && (
                  <div className="px-3 py-1 bg-black/40 text-white rounded-full text-[10px] font-bold backdrop-blur-md">
                    Media Items
                  </div>
                )}
              </div>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-xl font-bold text-gray-800 mb-1">{selectedProperty.location}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{selectedProperty.description || 'No description provided.'}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                    <Tag className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">Type</p>
                    <p className="text-sm font-semibold text-gray-700">{selectedProperty.property_type || '—'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                    <Check className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">Price</p>
                    <p className="text-sm font-semibold text-gray-700">{selectedProperty.price_range || '—'}</p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 grid grid-cols-1 gap-4">
                 <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">Owner Name</p>
                    <p className="text-sm font-semibold text-gray-700">{selectedProperty.owner_name || '—'}</p>
                  </div>
                </div>
                 <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">Owner Number</p>
                    <p className="text-sm font-semibold text-gray-700">{selectedProperty.owner_number || '—'}</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                {selectedProperty.url && (
                  <a
                    href={selectedProperty.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Visit Website
                  </a>
                )}
                <button
                  onClick={() => { setShowDetail(false); openEdit(selectedProperty); }}
                  className="px-6 py-2.5 border border-gray-200 text-gray-600 text-sm font-bold rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Edit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
