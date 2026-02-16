import { Search, SlidersHorizontal } from 'lucide-react';
import { useState } from 'react';

interface SessionFiltersProps {
    onSearch: (query: string) => void;
    onCategoryChange: (category: string) => void;
    onSortChange: (sort: string) => void;
    categories: string[];
}

export function SessionFilters({ onSearch, onCategoryChange, onSortChange, categories }: SessionFiltersProps) {
    const [query, setQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('All');
    const [sortBy, setSortBy] = useState('date');

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSearch(query);
    };

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Search Bar */}
            <form onSubmit={handleSearchSubmit} className="relative group max-w-2xl mx-auto">
                <div className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
                    <Search className="w-5 h-5" />
                </div>
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search by topic, teacher, or category..."
                    className="w-full pl-14 pr-24 py-5 bg-background border-2 border-border rounded-[2rem] focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-lg shadow-xl shadow-black/5"
                />
                <button
                    type="submit"
                    className="absolute right-3 top-1/2 -translate-y-1/2 px-6 py-2.5 bg-primary text-primary-foreground font-bold rounded-3xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                >
                    Global Search
                </button>
            </form>

            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                {/* Categories */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2 w-full md:w-auto scrollbar-hide no-scrollbar">
                    {['All', ...categories].map((cat) => (
                        <button
                            key={cat}
                            onClick={() => {
                                setActiveCategory(cat);
                                onCategoryChange(cat === 'All' ? '' : cat);
                            }}
                            className={`px-6 py-2.5 rounded-full text-sm font-bold whitespace-nowrap border-2 transition-all ${activeCategory === cat
                                ? 'bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105'
                                : 'bg-card border-border text-muted-foreground hover:border-primary/50'
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                {/* Sort & Quick Actions */}
                <div className="flex items-center gap-4 w-full md:w-auto border-t md:border-t-0 pt-4 md:pt-0 border-border">
                    <div className="flex items-center gap-2 bg-card p-1.5 rounded-full border border-border shadow-inner">
                        <button
                            onClick={() => { setSortBy('date'); onSortChange('date'); }}
                            className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${sortBy === 'date' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}
                        >
                            Newest
                        </button>
                        <button
                            onClick={() => { setSortBy('popularity'); onSortChange('popularity'); }}
                            className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${sortBy === 'popularity' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}
                        >
                            Popular
                        </button>
                        <button
                            onClick={() => { setSortBy('price'); onSortChange('price'); }}
                            className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${sortBy === 'price' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}
                        >
                            Price
                        </button>
                    </div>

                    <button className="flex items-center gap-2 px-4 py-3 bg-muted/50 hover:bg-muted text-muted-foreground rounded-full transition-all text-xs font-bold">
                        <SlidersHorizontal className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Advanced Filters</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
