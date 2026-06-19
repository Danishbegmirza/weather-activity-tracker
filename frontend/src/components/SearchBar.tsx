import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@apollo/client';
import { Search, MapPin, X, Loader2 } from 'lucide-react';
import { SEARCH_CITIES } from '../graphql/queries';
import { City } from '../types';

interface SearchBarProps {
  onSelectCity: (city: City) => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({ onSelectCity }) => {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);

  // Debounce the search query to optimize API requests
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [query]);

  // Execute query when debounced query is ready
  const { data, loading, error } = useQuery(SEARCH_CITIES, {
    variables: { query: debouncedQuery },
    skip: debouncedQuery.trim().length < 2,
  });

  // Close suggestions dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const cities: City[] = data?.searchCities || [];

  // Reset active index when cities change
  useEffect(() => {
    setActiveIndex(-1);
  }, [cities]);

  const handleSelect = useCallback((city: City) => {
    onSelectCity(city);
    setQuery('');
    setIsOpen(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
  }, [onSelectCity]);

  const handleClear = () => {
    setQuery('');
    setIsOpen(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || cities.length === 0) {
      if (event.key === 'ArrowDown' && query.trim().length >= 2) {
        setIsOpen(true);
      }
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setActiveIndex((prev) => (prev < cities.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        event.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : cities.length - 1));
        break;
      case 'Enter':
        event.preventDefault();
        if (activeIndex >= 0 && activeIndex < cities.length) {
          handleSelect(cities[activeIndex]);
        }
        break;
      case 'Escape':
        event.preventDefault();
        setIsOpen(false);
        setActiveIndex(-1);
        break;
      case 'Tab':
        setIsOpen(false);
        setActiveIndex(-1);
        break;
      case 'Home':
        if (cities.length > 0) {
          event.preventDefault();
          setActiveIndex(0);
        }
        break;
      case 'End':
        if (cities.length > 0) {
          event.preventDefault();
          setActiveIndex(cities.length - 1);
        }
        break;
    }
  };

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0 && listboxRef.current) {
      const activeElement = listboxRef.current.children[activeIndex] as HTMLElement;
      activeElement?.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  const listboxId = 'city-search-listbox';
  const getOptionId = (index: number) => `city-option-${index}`;
  const showDropdown = isOpen && query.trim().length >= 2;

  return (
    <div 
      className="search-container" 
      ref={containerRef} 
      style={{ position: 'relative', width: '100%' }}
      role="combobox"
      aria-expanded={showDropdown}
      aria-haspopup="listbox"
      aria-owns={listboxId}
    >
      <div className="search-input-wrapper glass">
        <Search className="search-icon" size={20} aria-hidden="true" />
        <input
          ref={inputRef}
          id="city-search-input"
          type="text"
          placeholder="Search for a city or town..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          role="combobox"
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-activedescendant={activeIndex >= 0 ? getOptionId(activeIndex) : undefined}
          aria-label="Search for a city or town"
        />
        {loading && <Loader2 className="loading-spinner" size={18} aria-hidden="true" />}
        {query && !loading && (
          <button 
            className="clear-btn" 
            onClick={handleClear} 
            aria-label="Clear search"
            type="button"
          >
            <X size={18} aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Suggestion Dropdown with proper ARIA listbox */}
      {showDropdown && (
        <ul
          ref={listboxRef}
          id={listboxId}
          className="search-dropdown glass animate-fade-in"
          role="listbox"
          aria-label="City search results"
        >
          {loading && cities.length === 0 && (
            <li className="dropdown-info" role="status" aria-live="polite">
              Searching cities...
            </li>
          )}
          {error && (
            <li className="dropdown-info error" role="alert">
              Error searching cities.
            </li>
          )}
          {!loading && cities.length === 0 && !error && (
            <li className="dropdown-info" role="status">
              No cities found for "{query}"
            </li>
          )}
          {cities.map((city, idx) => {
            const isActive = idx === activeIndex;
            const cityLabel = `${city.name}${city.admin1 ? `, ${city.admin1}` : ''}, ${city.country}`;
            
            return (
              <li
                key={`${city.name}-${city.latitude}-${idx}`}
                id={getOptionId(idx)}
                className={`dropdown-item ${isActive ? 'active' : ''}`}
                onClick={() => handleSelect(city)}
                onMouseEnter={() => setActiveIndex(idx)}
                role="option"
                aria-selected={isActive}
                tabIndex={-1}
              >
                <MapPin className="pin-icon" size={16} aria-hidden="true" />
                <div className="city-details">
                  <span className="city-name">{city.name}</span>
                  <span className="city-region">
                    {city.admin1 ? `${city.admin1}, ` : ''}
                    {city.country}
                  </span>
                </div>
                <span className="visually-hidden">{cityLabel}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
