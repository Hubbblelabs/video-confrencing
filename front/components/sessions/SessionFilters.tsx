import { Search, SlidersHorizontal } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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
        <div className="space-y-10 animate-fade-in max-w-5xl mx-auto">
            {/* Search Bar */}
            <form onSubmit={handleSearchSubmit} className="relative group max-w-2xl mx-auto">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5 group-focus-within:text-primary transition-colors" />
                    <Input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search by topic, teacher, or category..."
                        className="w-full pl-12 pr-32 h-14 bg-background/80 backdrop-blur-sm border-2 border-border/50 rounded-full focus-visible:ring-0 focus-visible:border-primary/50 text-lg shadow-lg shadow-primary/5 transition-all"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                        <Button
                            type="submit"
                            size="sm"
                            className="rounded-full px-6 h-10 font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
                        >
                            Global Search
                        </Button>
                    </div>
                </div>
            </form>

            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                {/* Categories */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2 w-full md:w-auto scrollbar-hide no-scrollbar mask-linear-fade">
                    {['All', ...categories].map((cat) => (
                        <Button
                            key={cat}
                            variant={activeCategory === cat ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => {
                                setActiveCategory(cat);
                                onCategoryChange(cat === 'All' ? '' : cat);
                            }}
                            className={`rounded-full px-5 py-5 font-bold transition-all ${activeCategory === cat
                                ? 'shadow-lg shadow-primary/20 scale-105'
                                : 'bg-background/50 border-border/50 hover:bg-muted/50 text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            {cat}
                        </Button>
                    ))}
                </div>

                {/* Sort & Quick Actions */}
                <div className="flex items-center gap-3 w-full md:w-auto border-t md:border-t-0 pt-4 md:pt-0 border-border/50">
                    <div className="flex items-center gap-1 bg-background/50 p-1 rounded-full border border-border/50 shadow-sm">
                        {[
                            { id: 'date', label: 'Newest' },
                            { id: 'popularity', label: 'Popular' },
                            { id: 'price', label: 'Price' }
                        ].map((opt) => (
                            <Button
                                key={opt.id}
                                variant="ghost"
                                size="sm"
                                onClick={() => { setSortBy(opt.id); onSortChange(opt.id); }}
                                className={`rounded-full h-8 px-3 text-xs font-bold transition-all ${sortBy === opt.id
                                    ? 'bg-background shadow-sm text-foreground ring-1 ring-border'
                                    : 'text-muted-foreground hover:text-foreground'
                                    }`}
                            >
                                {opt.label}
                            </Button>
                        ))}
                    </div>

                    <Button variant="outline" size="sm" className="gap-2 rounded-full h-10 px-4 bg-background/50 border-border/50">
                        <SlidersHorizontal className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline font-bold text-xs">More Filters</span>
                    </Button>
                </div>
            </div>
        </div>
    );
}
