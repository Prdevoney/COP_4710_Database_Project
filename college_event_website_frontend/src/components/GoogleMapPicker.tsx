import React, { useEffect, useRef, useState } from 'react';
import { Button, Modal } from 'react-bootstrap';

interface GoogleMapPickerProps {
  onLocationSelected: (locationData: {
    latitude: number;
    longitude: number;
  }) => void;
  initialLatitude?: number;
  initialLongitude?: number;
}

// Declare Google Maps related types
declare global {
  interface Window {
    google: {
      maps: {
        Map: new (element: HTMLElement, options: any) => any;
        Marker: new (options: any) => any;
        places: {
          SearchBox: new (input: HTMLElement) => any;
        };
        event: {
          removeListener: (listener: any) => void;
        };
        ControlPosition: {
          TOP_CENTER: number;
          [key: string]: number;
        };
      };
    };
  }
}

const GoogleMapPicker: React.FC<GoogleMapPickerProps> = ({
  onLocationSelected,
  initialLatitude = 28.602671, // Default to UCF coordinates
  initialLongitude = -81.200254
}) => {
  const [showModal, setShowModal] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [selectedPosition, setSelectedPosition] = useState({
    lat: initialLatitude,
    lng: initialLongitude
  });

  // Initialize map when modal is shown
  useEffect(() => {
    if (showModal && mapRef.current && window.google && window.google.maps) {
      // Create a new map instance
      mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
        center: { lat: selectedPosition.lat, lng: selectedPosition.lng },
        zoom: 15,
        mapTypeId: 'roadmap',
        mapTypeControl: true,
        fullscreenControl: true
      });

      // Create a marker at the initial/saved position
      markerRef.current = new window.google.maps.Marker({
        position: { lat: selectedPosition.lat, lng: selectedPosition.lng },
        map: mapInstanceRef.current,
        draggable: true,
        title: 'Drag me to the event location'
      });

      // Add click listener to the map to move the marker
      mapInstanceRef.current.addListener('click', (event: any) => {
        const newPosition = {
          lat: event.latLng.lat(),
          lng: event.latLng.lng()
        };
        markerRef.current.setPosition(newPosition);
        setSelectedPosition(newPosition);
      });

      // Listen to marker drag events
      markerRef.current.addListener('dragend', () => {
        const position = markerRef.current.getPosition();
        const newPosition = {
          lat: position.lat(),
          lng: position.lng()
        };
        setSelectedPosition(newPosition);
      });
      
      // Add a search box to the map
      const input = document.createElement('input');
      input.placeholder = 'Search for a location';
      input.className = 'form-control map-search-box';
      input.style.margin = '10px';
      input.style.width = 'calc(100% - 20px)';
      input.style.height = '40px';
      input.style.padding = '0 12px';
      
      mapInstanceRef.current.controls[window.google.maps.ControlPosition.TOP_CENTER].push(input);
      
      const searchBox = new window.google.maps.places.SearchBox(input);
      
      // Listen for the event fired when the user selects a prediction
      searchBox.addListener('places_changed', () => {
        const places = searchBox.getPlaces();
        
        if (places && places.length > 0) {
          const place = places[0];
          
          if (place.geometry && place.geometry.location) {
            const newPosition = {
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng()
            };
            
            // Update map position
            mapInstanceRef.current.setCenter(newPosition);
            
            // Update marker position
            markerRef.current.setPosition(newPosition);
            
            // Update state with position
            setSelectedPosition(newPosition);
          }
        }
      });
    }
  }, [showModal, selectedPosition.lat, selectedPosition.lng]);

  const handleConfirmLocation = () => {
    onLocationSelected({
      latitude: selectedPosition.lat,
      longitude: selectedPosition.lng
    });
    setShowModal(false);
  };

  return (
    <>
      <Button 
        variant="outline-primary" 
        onClick={() => setShowModal(true)}
        className="w-100"
      >
        {selectedPosition.lat !== initialLatitude || selectedPosition.lng !== initialLongitude
          ? 'Change Map Location'
          : 'Select Location on Map'}
      </Button>

      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Select Location on Map</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div 
            ref={mapRef} 
            style={{ 
              height: '500px', 
              width: '100%',
              position: 'relative'
            }}
          ></div>
          
          <div className="mt-3 text-center">
            <p>
              Click on the map or drag the marker to set your event location. 
              You can also search for a specific place using the search box.
            </p>
            <p className="text-muted">
              Selected coordinates: {selectedPosition.lat.toFixed(6)}, {selectedPosition.lng.toFixed(6)}
            </p>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleConfirmLocation}>
            Confirm Location
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default GoogleMapPicker;