import { useState, useEffect } from 'react';
import axios from 'axios';
import { API, toast } from '../../App';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import { Input } from '@/components/ui/input';

const AVAILABLE_ICONS = [
    'Globe', 'Key', 'Search', 'Binary', 'Lightbulb', 'Shield', 'Lock',
    'Code', 'Database', 'Server', 'Terminal', 'Wifi', 'Bug', 'Fingerprint'
];

// Available colors for categories
const AVAILABLE_COLORS = [
    { name: 'Indigo', value: '#6366f1' },
    { name: 'Green', value: '#21f505' },
    { name: 'Cyan', value: '#06b6d4' },
    { name: 'Orange', value: '#f19d00' },
    { name: 'Pink', value: '#ec4899' },
    { name: 'Purple', value: '#8b5cf6' },
    { name: 'Red', value: '#ef4444' },
    { name: 'Yellow', value: '#eab308' },
    { name: 'Teal', value: '#14b8a6' },
    { name: 'Gray', value: '#64748b' },
];

const AdminCategories = () => {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        icon: 'Globe',
        color: '#6366f1'
    });

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            const response = await axios.get(`${API}/admin/categories`);
            setCategories(response.data);
        } catch (error) {
            toast.error('Failed to load categories');
        } finally {
            setLoading(false);
        }
    };

    const openCreateModal = () => {
        setEditingCategory(null);
        setFormData({ name: '', description: '', icon: 'Globe', color: '#6366f1' });
        setShowModal(true);
    };

    const openEditModal = (category) => {
        setEditingCategory(category);
        setFormData({
            name: category.name,
            description: category.description,
            icon: category.icon,
            color: category.color || '#6366f1'
        });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingCategory) {
                await axios.put(`${API}/admin/categories/${editingCategory.id}`, formData);
                toast.success('Category updated');
            } else {
                await axios.post(`${API}/admin/categories`, formData);
                toast.success('Category created');
            }
            setShowModal(false);
            fetchCategories();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to save category');
        }
    };

    const handleDelete = async (category) => {
        if (!confirm(`Delete "${category.name}"? Challenges in this category will not be deleted.`)) {
            return;
        }
        try {
            await axios.delete(`${API}/admin/categories/${category.id}`);
            toast.success('Category deleted');
            fetchCategories();
        } catch (error) {
            toast.error('Failed to delete category');
        }
    };

    if (loading) {
        return (
            <div className="p-8">
                <div className="animate-pulse space-y-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-20 bg-gray-200 rounded-xl" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Categories</h1>
                    <p className="text-gray-500 mt-1">{categories.length} categories total</p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
                >
                    <Plus className="w-5 h-5" />
                    New Category
                </button>
            </div>

            {/* Categories Grid */}
            <div className="grid grid-cols-3 gap-6">
                {categories.map(category => (
                    <div
                        key={category.id}
                        className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-lg transition-shadow"
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                                <span className="text-indigo-600 font-bold text-lg">
                                    {category.icon.substring(0, 2)}
                                </span>
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => openEditModal(category)}
                                    className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => handleDelete(category)}
                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                        <h3 className="font-semibold text-gray-900 mb-2">{category.name}</h3>
                        <p className="text-sm text-gray-500 line-clamp-2">{category.description}</p>
                        <div className="mt-4 pt-4 border-t border-gray-100">
                            <p className="text-xs text-gray-400">
                                Icon: <span className="font-mono text-gray-600">{category.icon}</span>
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            {categories.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                    No categories yet. Create one to get started.
                </div>
            )}

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-8">
                    <div className="bg-white rounded-2xl w-full max-w-md">
                        <div className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-gray-900">
                                {editingCategory ? 'Edit Category' : 'New Category'}
                            </h2>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            {/* Name */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                                <Input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                    required
                                    placeholder="Web Exploitation"
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                    required
                                    rows={3}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    placeholder="Web vulnerabilities and exploitation techniques"
                                />
                            </div>

                            {/* Icon */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Icon</label>
                                <select
                                    value={formData.icon}
                                    onChange={(e) => setFormData(prev => ({ ...prev, icon: e.target.value }))}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                                >
                                    {AVAILABLE_ICONS.map(icon => (
                                        <option key={icon} value={icon}>{icon}</option>
                                    ))}
                                </select>
                                <p className="text-xs text-gray-400 mt-1">
                                    Icons from Lucide React
                                </p>
                            </div>

                            {/* Color */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
                                <div className="grid grid-cols-5 gap-3">
                                    {AVAILABLE_COLORS.map(colorOption => (
                                        <button
                                            key={colorOption.value}
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, color: colorOption.value }))}
                                            className={`w-10 h-10 rounded-xl border-2 transition-all ${formData.color === colorOption.value ? 'border-gray-900 scale-110' : 'border-transparent hover:scale-105'}`}
                                            style={{ backgroundColor: colorOption.value }}
                                            title={colorOption.name}
                                        />
                                    ))}
                                </div>
                                <p className="text-xs text-gray-400 mt-2">
                                    Selected: <span className="font-mono">{formData.color}</span>
                                </p>
                            </div>

                            {/* Submit */}
                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
                                >
                                    <Save className="w-4 h-4" />
                                    {editingCategory ? 'Save Changes' : 'Create Category'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminCategories;
