import React, { useState, useEffect } from 'react';
import { weatherService } from '../../services/weatherService';
import { Search, MapPin, X } from 'lucide-react';

interface LocationSelectorProps {
  selectedLocation: { lat: number; lon: number; name: string };
  onLocationChange: (location: { lat: number; lon: number; name: string }) => void;
  coordinates: {
    delhi: { lat: number; lon: number; name: string };
    punjab: { lat: number; lon: number; name: string };
  };
}

const LocationSelector: React.FC<LocationSelectorProps> = ({
  selectedLocation,
  onLocationChange,
  coordinates
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ name: string; country: string; state: string; lat: number; lon: number; displayName: string }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const handleSearch = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setIsSearching(true);
    setSearchError(null);

    try {
      const results = await weatherService.searchMultipleLocations(query);
      setSearchResults(results);
      setShowResults(true);
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : 'Search failed');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleLocationSelect = (location: { name: string; lat: number; lon: number; displayName: string }) => {
    onLocationChange({
      lat: location.lat,
      lon: location.lon,
      name: location.displayName || location.name
    });
    setSearchQuery('');
    setShowResults(false);
    setSearchResults([]);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    handleSearch(value);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setShowResults(false);
    setSearchResults([]);
    setSearchError(null);
  };

  // Quick location buttons
  const quickLocations = Object.values(coordinates);

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h3 className="text-lg font-semibold text-gray-800 mb-3">Select Location</h3>
      
      {/* Search Input */}
      <div className="relative mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            value={searchQuery}
            onChange={handleInputChange}
            placeholder="Search for any city..."
            className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {searchQuery && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Search Results */}
        {showResults && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {isSearching ? (
              <div className="p-3 text-center text-gray-500">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mx-auto mb-2"></div>
                Searching...
              </div>
            ) : searchResults.length > 0 ? (
              searchResults.map((location, index) => (
                <button
                  key={index}
                  onClick={() => handleLocationSelect(location)}
                  className="w-full text-left p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 text-gray-400 mr-2" />
                    <div>
                      <div className="font-medium text-gray-800">{location.displayName}</div>
                      <div className="text-sm text-gray-500">
                        {location.lat.toFixed(4)}, {location.lon.toFixed(4)}
                      </div>
                    </div>
                  </div>
                </button>
              ))
            ) : searchError ? (
              <div className="p-3 text-red-600 text-sm">{searchError}</div>
            ) : (
              <div className="p-3 text-gray-500 text-sm">No locations found</div>
            )}
          </div>
        )}
      </div>

      {/* Quick Location Buttons */}
      <div className="mb-3">
        <p className="text-sm text-gray-600 mb-2">Quick locations:</p>
        <div className="flex flex-wrap gap-2">
          {quickLocations.map((location) => (
            <button
              key={location.name}
              onClick={() => onLocationChange(location)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors duration-200 ${
                selectedLocation.name === location.name
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {location.name}
            </button>
          ))}
        </div>
      </div>

      {/* Current Location Display */}
      <div className="text-sm text-gray-500">
        <div className="flex items-center">
          <MapPin className="h-4 w-4 mr-1" />
          <span className="font-medium">{selectedLocation.name}</span>
        </div>
        <div className="ml-5 text-xs">
          Coordinates: {selectedLocation.lat.toFixed(4)}, {selectedLocation.lon.toFixed(4)}
        </div>
      </div>
    </div>
  );
};

export default LocationSelector;
