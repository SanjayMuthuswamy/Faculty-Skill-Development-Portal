import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Plus, Loader2 } from 'lucide-react';

interface AddNewItemModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (name: string) => Promise<void>;
    title: string;
    placeholder?: string;
    description?: string;
}

export function AddNewItemModal({
    isOpen,
    onClose,
    onAdd,
    title,
    placeholder = "Enter name...",
    description
}: AddNewItemModalProps) {
    const [name, setName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setIsSubmitting(true);
        setError(null);
        try {
            await onAdd(name.trim());
            setName('');
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to add item');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
        >
            <div className="space-y-4">
                {description && (
                    <p className="text-sm text-gray-500">{description}</p>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <input
                            autoFocus
                            type="text"
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                            placeholder={placeholder}
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            disabled={isSubmitting}
                        />
                        {error && (
                            <p className="text-xs text-red-500 font-medium pl-1">{error}</p>
                        )}
                    </div>

                    <div className="flex gap-2 pt-2">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="flex-1"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={!name.trim() || isSubmitting}
                            className="flex-1 gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            {isSubmitting ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Plus className="h-4 w-4" />
                            )}
                            Add Item
                        </Button>
                    </div>
                </form>
            </div>
        </Modal>
    );
}

/**
 * Reusable Select with 'Add New' option pattern
 */
interface SelectWithAddNewProps {
    options: string[];
    value: string;
    onChange: (value: string) => void;
    onAddNew: () => void;
    placeholder?: string;
    label?: string;
    className?: string;
}

export function SelectWithAddNew({
    options,
    value,
    onChange,
    onAddNew,
    placeholder = "Select an option",
    label,
    className
}: SelectWithAddNewProps) {
    return (
        <div className={className}>
            {label && <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">{label}</label>}
            <div className="relative group">
                <select
                    value={value}
                    onChange={(e) => {
                        if (e.target.value === "ADD_NEW") {
                            onAddNew();
                        } else {
                            onChange(e.target.value);
                        }
                    }}
                    className="w-full pl-4 pr-10 py-3 rounded-xl border border-gray-200 bg-white shadow-sm appearance-none focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm group-hover:border-primary/30"
                >
                    <option value="" disabled>{placeholder}</option>
                    {options.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                    ))}
                    <hr className="my-1 border-gray-100" />
                    <option value="ADD_NEW" className="font-bold text-primary italic">
                        + Add New Option...
                    </option>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 group-hover:text-primary transition-colors">
                    <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                        <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                    </svg>
                </div>
            </div>
        </div>
    );
}
