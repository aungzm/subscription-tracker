"use client";
import { useState, useEffect } from "react";
import { PlusCircle, Trash2, Check, ChevronDown, Pencil, X } from "lucide-react";

// Import shadcn/ui components
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type Category = {
  id: string; // Prisma uses string IDs (cuid), not number
  name: string;
  color: string;
};

// Predefined color palette
const colorOptions = [
  { name: "Red", value: "#ef4444" },
  { name: "Orange", value: "#f97316" },
  { name: "Amber", value: "#f59e0b" },
  { name: "Yellow", value: "#eab308" },
  { name: "Lime", value: "#84cc16" },
  { name: "Green", value: "#22c55e" },
  { name: "Emerald", value: "#10b981" },
  { name: "Teal", value: "#14b8a6" },
  { name: "Cyan", value: "#06b6d4" },
  { name: "Sky", value: "#0ea5e9" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Indigo", value: "#6366f1" },
  { name: "Violet", value: "#8b5cf6" },
  { name: "Purple", value: "#a855f7" },
  { name: "Fuchsia", value: "#d946ef" },
  { name: "Pink", value: "#ec4899" },
  { name: "Rose", value: "#f43f5e" },
  { name: "Gray", value: "#6b7280" },
];

export const CategoriesSettings = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [newCategoryColor, setNewCategoryColor] = useState("#3b82f6");
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("#3b82f6");
  const [isEditColorPickerOpen, setIsEditColorPickerOpen] = useState(false);

  // Fetch categories from the API on component mount
  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await fetch("/api/categories");
        if (!res.ok) throw new Error("Failed to fetch categories");
        const data = await res.json();
        setCategories(data);
      } catch (error) {
        console.error("Error fetching categories:", error);
      }
    }
    fetchCategories();
  }, []);

  const addCategory = async () => {
    if (newCategory.trim() === "") return;

    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCategory, color: newCategoryColor }),
      });

      if (!res.ok) throw new Error("Failed to add category");

      const createdCategory = await res.json();
      setCategories([...categories, createdCategory]);
      setNewCategory("");
      setIsColorPickerOpen(false);
    } catch (error) {
      console.error("Error adding category:", error);
    }
  };

  const deleteCategory = async (id: string) => {
    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete category");

      setCategories(categories.filter((cat) => cat.id !== id));
    } catch (error) {
      console.error("Error deleting category:", error);
    }
  };

  // Start editing a category
  const startEdit = (category: Category) => {
    setEditingId(category.id);
    setEditName(category.name);
    setEditColor(category.color);
    setIsEditColorPickerOpen(false);
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditColor("#3b82f6");
    setIsEditColorPickerOpen(false);
  };

  // Save edited category
  const saveEdit = async () => {
    if (!editingId || editName.trim() === "") return;

    try {
      const res = await fetch(`/api/categories/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName, color: editColor }),
      });

      if (!res.ok) throw new Error("Failed to update category");

      const updatedCategory = await res.json();
      setCategories(
        categories.map((cat) =>
          cat.id === editingId ? updatedCategory : cat
        )
      );
      cancelEdit();
    } catch (error) {
      console.error("Error updating category:", error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Add new category */}
      <div className="flex items-center space-x-2">
        <input
          type="text"
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          placeholder="New category name"
          className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background flex-1"
        />

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Popover open={isColorPickerOpen} onOpenChange={setIsColorPickerOpen}>
                <PopoverTrigger asChild>
                  <button
                    aria-label="Select color"
                    className="h-10 w-10 rounded-md border border-input flex items-center justify-center"
                    style={{ background: newCategoryColor }}
                  >
                    <ChevronDown className="h-4 w-4 text-white drop-shadow" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-3">
                  <div className="grid grid-cols-6 gap-2">
                    {colorOptions.map((color) => (
                      <Tooltip key={color.value}>
                        <TooltipTrigger asChild>
                          <button
                            className="h-8 w-8 rounded-md relative flex items-center justify-center"
                            style={{ backgroundColor: color.value }}
                            onClick={() => {
                              setNewCategoryColor(color.value);
                              setIsColorPickerOpen(false);
                            }}
                          >
                            {newCategoryColor === color.value && (
                              <Check className="h-4 w-4 text-white drop-shadow" />
                            )}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                          <p>{color.name}</p>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </div>

                  <div className="mt-4">
                    <label className="text-sm font-medium">Custom color</label>
                    <div className="flex mt-2">
                      <input
                        type="color"
                        value={newCategoryColor}
                        onChange={(e) => setNewCategoryColor(e.target.value)}
                        className="h-8 w-8 rounded-md border border-input cursor-pointer"
                      />
                      <input
                        type="text"
                        value={newCategoryColor}
                        onChange={(e) => setNewCategoryColor(e.target.value)}
                        className="flex h-8 ml-2 rounded-md border border-input px-3 py-1 text-sm flex-1"
                      />
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Choose a color</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <button
          onClick={addCategory}
          disabled={newCategory.trim() === ""}
          className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground h-10 px-4 py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Add
        </button>
      </div>

      {/* List categories */}
      <div className="space-y-2">
        {categories.map((category) =>
          editingId === category.id ? (
            <div
              key={category.id}
              className="flex items-center justify-between p-3 border rounded-md bg-accent/30"
            >
              <div className="flex items-center space-x-2 flex-1">
                <Popover
                  open={isEditColorPickerOpen}
                  onOpenChange={setIsEditColorPickerOpen}
                >
                  <PopoverTrigger asChild>
                    <button
                      aria-label="Edit color"
                      className="h-8 w-8 rounded-md border border-input flex items-center justify-center"
                      style={{ background: editColor }}
                    >
                      <ChevronDown className="h-4 w-4 text-white drop-shadow" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-3">
                    <div className="grid grid-cols-6 gap-2">
                      {colorOptions.map((color) => (
                        <Tooltip key={color.value}>
                          <TooltipTrigger asChild>
                            <button
                              className="h-8 w-8 rounded-md relative flex items-center justify-center"
                              style={{ backgroundColor: color.value }}
                              onClick={() => {
                                setEditColor(color.value);
                                setIsEditColorPickerOpen(false);
                              }}
                            >
                              {editColor === color.value && (
                                <Check className="h-4 w-4 text-white drop-shadow" />
                              )}
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom">
                            <p>{color.name}</p>
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                    <div className="mt-4">
                      <label className="text-sm font-medium">Custom color</label>
                      <div className="flex mt-2">
                        <input
                          type="color"
                          value={editColor}
                          onChange={(e) => setEditColor(e.target.value)}
                          className="h-8 w-8 rounded-md border border-input cursor-pointer"
                        />
                        <input
                          type="text"
                          value={editColor}
                          onChange={(e) => setEditColor(e.target.value)}
                          className="flex h-8 ml-2 rounded-md border border-input px-3 py-1 text-sm flex-1"
                        />
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="flex-1 h-8 rounded-md border border-input px-3 py-1 text-sm"
                />
              </div>
              <div className="flex items-center space-x-2 ml-2">
                <button
                  onClick={saveEdit}
                  className="text-green-600 hover:text-green-800 transition-colors"
                  aria-label="Save"
                >
                  <Check className="h-5 w-5" />
                </button>
                <button
                  onClick={cancelEdit}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                  aria-label="Cancel"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          ) : (
            <div
              key={category.id}
              className="flex items-center justify-between p-3 border rounded-md hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center space-x-2">
                <span
                  className="inline-block h-5 w-5 rounded-full"
                  style={{ backgroundColor: category.color }}
                />
                <span className="font-medium">{category.name}</span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => startEdit(category)}
                  className="text-muted-foreground hover:text-primary transition-colors"
                  aria-label={`Edit ${category.name} category`}
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => deleteCategory(category.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                  aria-label={`Delete ${category.name} category`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          )
        )}

        {categories.length === 0 && (
          <div className="p-8 text-center text-muted-foreground border border-dashed rounded-md">
            No categories yet. Add your first category above.
          </div>
        )}
      </div>
    </div>
  );
};
