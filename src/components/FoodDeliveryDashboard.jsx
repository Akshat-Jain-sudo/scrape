import React, { useState, useEffect } from 'react';
import { Search, MapPin, Store, Utensils, Star, ArrowLeft, ArrowRight, RefreshCw, ShoppingBag } from 'lucide-react';
import { useLocationContext } from '../context/LocationContext';
import SpeedCostMatrix from './SpeedCostMatrix';

function FoodDeliveryDashboard({ baseUrl }) {
  const { location } = useLocationContext();
  const [searchMode, setSearchMode] = useState('outlet'); // 'outlet' or 'food'
  const [searchQuery, setSearchQuery] = useState('');
  
  const [restaurants, setRestaurants] = useState([]);
  const [loadingRestaurants, setLoadingRestaurants] = useState(false);
  
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [menu, setMenu] = useState([]);
  const [loadingMenu, setLoadingMenu] = useState(false);
  
  const [comparingDish, setComparingDish] = useState(null);
  const [comparisonData, setComparisonData] = useState(null);
  const [loadingComparison, setLoadingComparison] = useState(false);

  const [foodComparisons, setFoodComparisons] = useState({});
  const [loadingFoodComparisons, setLoadingFoodComparisons] = useState({});

  useEffect(() => {
    fetchRestaurants();
  }, [location]);

  const fetchRestaurants = async (query = '') => {
    setLoadingRestaurants(true);
    setSelectedRestaurant(null);
    setFoodComparisons({});
    
    try {
      let url = `${baseUrl}/api/food/restaurants?`;
      if (location) {
        if (location.lat) url += `lat=${location.lat}&lng=${location.lng}&`;
        if (location.city) url += `city=${encodeURIComponent(location.city)}&`;
        if (location.locality) url += `locality=${encodeURIComponent(location.locality)}&`;
      }
      if (query) url += `query=${encodeURIComponent(query)}`;
      
      const res = await fetch(url);
      const data = await res.json();
      setRestaurants(data);

      if (searchMode === 'food' && query.trim() !== '') {
        data.forEach(rest => {
          fetchComparisonForRestaurant(query, rest);
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingRestaurants(false);
    }
  };

  const fetchComparisonForRestaurant = async (foodQuery, restaurant) => {
    setLoadingFoodComparisons(prev => ({ ...prev, [restaurant.id]: true }));
    try {
      const payload = {
        query: foodQuery,
        category: 'food',
        location: location,
        baseProduct: {
          name: `${foodQuery} from ${restaurant.name}`,
          price: 200 + Math.floor(Math.random() * 200),
          imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200'
        },
        selectedSources: ['zomato', 'swiggy']
      };

      const res = await fetch(`${baseUrl}/api/compare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      setFoodComparisons(prev => ({ ...prev, [restaurant.id]: data }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingFoodComparisons(prev => ({ ...prev, [restaurant.id]: false }));
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchRestaurants(searchQuery);
  };

  const handleRestaurantClick = async (rest) => {
    if (searchMode === 'food') return;
    setSelectedRestaurant(rest);
    setLoadingMenu(true);
    setComparingDish(null);
    setComparisonData(null);
    try {
      const res = await fetch(`${baseUrl}/api/food/menu?restaurantId=${rest.id}&restaurantName=${encodeURIComponent(rest.name)}`);
      const data = await res.json();
      setMenu(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMenu(false);
    }
  };

  const compareDish = async (dish) => {
    setComparingDish(dish);
    setLoadingComparison(true);
    try {
      const payload = {
        query: dish.name,
        category: 'food',
        location: location,
        baseProduct: {
          name: `${dish.name} from ${selectedRestaurant.name}`,
          price: dish.price,
          imageUrl: dish.imageUrl
        },
        selectedSources: ['zomato', 'swiggy']
      };

      const res = await fetch(`${baseUrl}/api/compare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      setComparisonData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingComparison(false);
    }
  };

  return (
    <div className="food-delivery-dashboard">
      <div className="glass-card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h2 style={{ margin: 0 }}><Utensils size={24} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }}/> Food Delivery</h2>
          {location && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              <MapPin size={16} color="var(--accent-primary)" />
              {location.displayLabel}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
          <button 
            className={`btn ${searchMode === 'outlet' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => { setSearchMode('outlet'); setSearchQuery(''); }}
            style={{ flex: 1, borderRadius: '8px', padding: '0.75rem' }}
          >
            <Store size={18} /> Search Outlets
          </button>
          <button 
            className={`btn ${searchMode === 'food' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => { setSearchMode('food'); setSearchQuery(''); }}
            style={{ flex: 1, borderRadius: '8px', padding: '0.75rem' }}
          >
            <Utensils size={18} /> Search Food
          </button>
        </div>

        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem' }}>
          <input 
            type="text" 
            className="console-input"
            style={{ flex: 1 }}
            placeholder={searchMode === 'outlet' ? "Search for restaurants (e.g. Burger King, Pizza Hut)" : "Search for a dish (e.g. Pizza, Biryani, Burger)"}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button type="submit" className="btn btn-primary" style={{ padding: '0 1.5rem' }}>
            <Search size={18} /> Search
          </button>
        </form>
      </div>

      {selectedRestaurant ? (
        <div className="glass-card stagger-in">
          <button className="btn btn-outline" onClick={() => setSelectedRestaurant(null)} style={{ marginBottom: '1rem', padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
            <ArrowLeft size={16} /> Back to Restaurants
          </button>
          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1.5rem' }}>
            <img src={selectedRestaurant.imageUrl} alt={selectedRestaurant.name} style={{ width: '120px', height: '120px', objectFit: 'cover', borderRadius: '8px' }} />
            <div>
              <h2 style={{ margin: '0 0 0.5rem 0' }}>{selectedRestaurant.name}</h2>
              <p style={{ margin: '0 0 0.5rem 0', color: 'var(--text-muted)' }}>{selectedRestaurant.cuisine}</p>
              <div style={{ display: 'flex', gap: '1rem', fontSize: '0.9rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--success-glow)', color: 'var(--success)', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold' }}>
                  <Star size={14} fill="var(--success)"/> {selectedRestaurant.rating} ({selectedRestaurant.reviews})
                </span>
                <span style={{ color: 'var(--text-secondary)' }}>📍 {selectedRestaurant.distance}</span>
                <span style={{ color: 'var(--text-secondary)' }}>🚚 {selectedRestaurant.deliveryTime}</span>
              </div>
            </div>
          </div>

          {loadingMenu ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <RefreshCw className="animate-spin" size={32} style={{ color: 'var(--accent-primary)', marginBottom: '1rem' }} />
              <p>Loading Menu...</p>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                {menu.map((category, idx) => (
                  <div key={idx} style={{ marginBottom: '2.5rem' }}>
                    <h3 style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.75rem', marginBottom: '1.25rem', color: 'var(--text-primary)' }}>{category.name}</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {category.dishes.map(dish => (
                        <div key={dish.id} className="glass-card" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', border: comparingDish?.id === dish.id ? '1px solid var(--accent-primary)' : '1px solid rgba(255,255,255,0.05)', transition: 'all 0.2s', background: comparingDish?.id === dish.id ? 'rgba(245, 114, 36, 0.05)' : '' }} onClick={() => compareDish(dish)}>
                          <div style={{ flex: 1, paddingRight: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                              <span style={{ color: dish.isVeg ? '#10b981' : '#ef4444', border: `1px solid ${dish.isVeg ? '#10b981' : '#ef4444'}`, borderRadius: '4px', padding: '0 4px', fontSize: '0.65rem' }}>
                                {dish.isVeg ? 'VEG' : 'NON-VEG'}
                              </span>
                              <strong style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>{dish.name}</strong>
                            </div>
                            <div style={{ fontWeight: 'bold', marginBottom: '0.5rem', fontSize: '1.05rem' }}>₹{dish.price}</div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{dish.description}</div>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                            <img src={dish.imageUrl} alt={dish.name} style={{ width: '90px', height: '90px', objectFit: 'cover', borderRadius: '8px' }} />
                            <button className="btn btn-primary" style={{ padding: '0.4rem 1rem', fontSize: '0.8rem', width: '100%' }}>Compare</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {comparingDish && (
                <div style={{ width: '400px', position: 'sticky', top: '20px' }}>
                  <div className="glass-card stagger-in" style={{ padding: '1.25rem' }}>
                    <h3 style={{ marginTop: 0, marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                      Comparing Prices
                    </h3>
                    
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', alignItems: 'center' }}>
                       <img src={comparingDish.imageUrl} alt="" style={{ width: '60px', height: '60px', borderRadius: '8px', objectFit: 'cover' }} />
                       <div>
                         <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{comparingDish.name}</div>
                         <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>from {selectedRestaurant.name}</div>
                       </div>
                    </div>

                    {loadingComparison ? (
                      <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                        <RefreshCw className="animate-spin" size={24} style={{ color: 'var(--accent-primary)', marginBottom: '1rem' }} />
                        <p style={{ color: 'var(--text-secondary)' }}>Fetching live prices from Zomato & Swiggy...</p>
                      </div>
                    ) : comparisonData ? (
                      <div>
                        {Object.entries(comparisonData.comparison).map(([store, storeData]) => (
                          <div key={store} style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '1.25rem', marginBottom: '1rem', background: 'rgba(0,0,0,0.2)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                              <span className={`store-badge store-badge-${store}`}>{store.toUpperCase()}</span>
                              <span style={{ fontSize: '1.3rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{storeData.priceFormatted}</span>
                            </div>
                            
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', background: 'rgba(255,255,255,0.03)', padding: '0.5rem', borderRadius: '4px' }}>
                              <span title="Item Price">🍲 ₹{comparingDish.price}</span>
                              <span title="Delivery Fee">🚚 ₹{storeData.deliveryFee || 0}</span>
                              <span title="Packaging Fee">📦 ₹{storeData.packagingFee || 0}</span>
                            </div>
                            
                            <a href={storeData.productLink} target="_blank" rel="noopener noreferrer" className="btn-store-go" style={{ width: '100%', justifyContent: 'center' }}>
                              Order on {store.charAt(0).toUpperCase() + store.slice(1)} <ArrowRight size={14} />
                            </a>
                          </div>
                        ))}
                        <SpeedCostMatrix comparisonData={comparisonData} />
                      </div>
                    ) : null}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div>
          {loadingRestaurants ? (
             <div style={{ textAlign: 'center', padding: '4rem' }}>
               <RefreshCw className="animate-spin" size={36} style={{ color: 'var(--accent-primary)', marginBottom: '1.25rem' }} />
               <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)' }}>Finding the best {searchMode === 'outlet' ? 'outlets' : 'options'} near you...</p>
             </div>
          ) : restaurants.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {restaurants.map((rest, idx) => (
                <div key={rest.id} className="glass-card stagger-in" style={{ padding: '1.5rem', animationDelay: `${idx * 0.05}s`, cursor: searchMode === 'outlet' ? 'pointer' : 'default', transition: 'transform 0.2s', ':hover': { transform: searchMode === 'outlet' ? 'translateY(-2px)' : 'none' } }} onClick={() => handleRestaurantClick(rest)}>
                  <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                    <img src={rest.imageUrl} alt={rest.name} style={{ width: '130px', height: '130px', objectFit: 'cover', borderRadius: '8px' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <h2 style={{ margin: '0 0 0.35rem 0', fontSize: '1.4rem' }}>{rest.name}</h2>
                          <p style={{ margin: '0 0 1rem 0', color: 'var(--text-muted)', fontSize: '0.95rem' }}>{rest.cuisine}</p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--success-glow)', color: 'var(--success)', padding: '4px 10px', borderRadius: '6px', fontWeight: 'bold', fontSize: '0.95rem' }}>
                          <Star size={16} fill="var(--success)"/> {rest.rating}
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><MapPin size={16}/> {rest.distance}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>🚚 {rest.deliveryTime}</span>
                        {searchMode === 'outlet' && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-primary)', marginLeft: 'auto', fontWeight: 'bold' }}>
                            View Menu <ArrowRight size={16} />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {searchMode === 'food' && searchQuery.trim() !== '' && (
                    <div style={{ marginTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1.5rem' }}>
                      <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text-primary)' }}>Price for "{searchQuery}" at {rest.name}</h4>
                      {loadingFoodComparisons[rest.id] ? (
                        <div style={{ padding: '1.5rem', textAlign: 'center', background: 'rgba(0,0,0,0.15)', borderRadius: '8px' }}>
                          <RefreshCw className="animate-spin" size={20} style={{ color: 'var(--accent-primary)', marginBottom: '0.75rem' }} />
                          <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Fetching prices from Zomato & Swiggy...</div>
                        </div>
                      ) : foodComparisons[rest.id] ? (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                          {Object.entries(foodComparisons[rest.id].comparison).map(([store, storeData]) => (
                            <div key={store} style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '1.25rem', background: 'rgba(255,255,255,0.02)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                <span className={`store-badge store-badge-${store}`}>{store.toUpperCase()}</span>
                                <span style={{ fontSize: '1.3rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{storeData.priceFormatted}</span>
                              </div>
                              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', marginBottom: '1.25rem', background: 'rgba(255,255,255,0.03)', padding: '0.5rem', borderRadius: '4px' }}>
                                <span>Del: ₹{storeData.deliveryFee || 0}</span>
                                <span>Pack: ₹{storeData.packagingFee || 0}</span>
                                <span>{storeData.deliveryTime}</span>
                              </div>
                              <a href={storeData.productLink} target="_blank" rel="noopener noreferrer" className="btn-store-go" style={{ width: '100%', justifyContent: 'center' }}>
                                Order <ArrowRight size={14} />
                              </a>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Could not fetch comparison data.</div>
                      )}
                    </div>
                  )}

                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
              <Store size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
              <p style={{ fontSize: '1.1rem' }}>No restaurants found. Try adjusting your search.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default FoodDeliveryDashboard;
