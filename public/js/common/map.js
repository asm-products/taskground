// ---------------------
// ----- Map Style -----
// ---------------------

var style = [
  {
	  "featureType": "landscape",
	  "stylers": [
      {"saturation": -100 },
      {"lightness": 60 }
    ]
  },
  {
    "featureType": "road.local",
    "stylers": [
      {"saturation": -100},
      {"lightness": 40},
      {"visibility": "on"}
    ]
  },
  {
    "featureType": "transit",
    "stylers": [
        {"saturation": -100},
        {"visibility": "simplified"}
    ]
  },
  {
    "featureType": "administrative.province",
    "stylers": [
      {"visibility": "off"}
    ]
  },
  {
    "featureType": "water",
    "stylers": [
      {"visibility": "on"},
      {"lightness": 30}
    ]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry.fill",
    "stylers": [
      {"color": "#ef8c25"},
      {"lightness": 40}
    ]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry.stroke",
    "stylers": [
      {"visibility": "off"}
    ]
  },
  {
    "featureType": "poi.park",
    "elementType": "geometry.fill",
    "stylers": [
      {"color": "#b6c54c"},
      {"lightness": 40},
      {"saturation": -40}
    ]
  },
  {}
];

// ----------------------
// ----- Map Object -----
// ----------------------

var Map = {
	
	/**
	 * todo marker image
	 */
	todoMarkerImage: new google.maps.MarkerImage(
		"/img/todo.png", null, null, null, new google.maps.Size(32,32)),

	/**
	 * todo marker image
	 */
	doneMarkerImage: new google.maps.MarkerImage(
		"/img/done.png", null, null, null, new google.maps.Size(32,32)),
		
	/**
	 * pivot marker image
	 */
	pivotMarkerImage: new google.maps.MarkerImage(
		"/img/pivot.png", null, null, null, new google.maps.Size(32,32)),

  /**
   * DOM map element id
   */
  elementId: 'map',

  /**
   * True if map can be edited
   */
  allowEdit: false,

  /**
   * Map object
   */
  map: null,

  /**
   * Markers group collections
   */
  markers: [],

  /**
   * Pivot marker
   */
  pivot: null,

  /**
   * Default marker
   */
  marker: null,

  /**
   * default zoom
   */
  defaultZoom: 4,

  /**
   * Default map options
   */
  options: {
    streetViewControl: false,
    zoomControlOptions: { style: 'SMALL'},
    scrollwheel: false,
    panControl: false,
    mapTypeId: google.maps.MapTypeId.ROADMAP,
    mapTypeControl: false,
    center: new google.maps.LatLng(41.382991, 2.1697998046),
    zoom: 4,
		styles: style,
    mapTypeId: google.maps.MapTypeId.ROADMAP
  },

  /**
   * Initialize map
   * @param {String} elementId
   * @param {Boolean} mobile
   */
  init: function(elementId, mobile) {
    elementId = elementId || this.elementId;
    if(window.innerWidth < 500 || document.documentElement.clientWidth < 500) {
      this.options.zoomControl = false;
    }
    this.map = new google.maps.Map(document.getElementById(elementId), this.options);
    google.maps.event.addListener(this.map, 'click', function(event) {
      if(Map.allowEdit) {
        Map.mapClick(event);
      }
    });

    // do not create pivot if is mobile
    if (mobile != true) {
      this.pivot = new google.maps.Marker({
        map: null,
        icon: this.pivotMarkerImage, // '/img/pivot.png',
        position: new google.maps.LatLng(0, 0),
        draggable: true
      });

      google.maps.event.addListener(this.pivot, 'position_changed', function(event) {
        Map.positionChanged(event);
      });
    }
  },

  /**
   * Map click event
   * @param {Obect} event
   */
  mapClick: function(event) {
    console.log("click on: " + event.latLng);
  },

  /**
   * Position changed event
   * @param {Object} event
   */
  positionChanged: function(event) {
    console.log('position changed');
  },

  /**
   * Add a marker with lat, lng, description and id
   * @param {String} id
   * @param {Number} lat
   * @param {Number} lng
   * @param {String} description
   */
  addMarker: function(id, lat, lng, description){
      var marker = new google.maps.Marker({
        map: this.map,
        id: id,
        title: description,
        icon: this.todoMarkerImage, //'/img/todo.png',
        position: new google.maps.LatLng(lat, lng),
				animation: google.maps.Animation.DROP
      });
      this.markers.push(marker);
      return (this.markers.length - 1);
      // TODO: infoWindows & Marker click event
  },

  /**
   * Update an existing marker
   * @param {String} id
   * @param {Number} lat
   * @param {Number} lng
   * @param {String} description
   */
  updateMarker: function(id, lat, lng, description) {
    this.markers[id].setOptions({
      title: description,
      position: new google.maps.LatLng(lat, lng)
    });
  },

  /**
   * Show a marker at a given lat and lng
   * @param {Number} lat
   * @param {Number} lng
   * @param {String} description
   */
  showMarker: function(lat, lng, description) {
    this.marker = this.marker || new google.maps.Marker({
      map: this.map,
      title: description,
      icon: this.todoMarkerImage, //'/img/todo.png',
      position: new google.maps.LatLng(lat, lng)
    });
    this.marker.setPosition(new google.maps.LatLng(lat,lng));
    this.marker.setMap(this.map);
    return this.marker;
  },

  /**
   * Clear an existing marker
   */
  clearMarker: function() {
    this.marker.setMap(null);
    this.marker = null;
  },

  /**
   * Remove an existing marker
   * @param {Number} index
   */
  removeMarker: function(index) {
    this.markers[index].setMap(null);
    delete this.markers[index];
  },

  /**
   * Show pivot marker
   * @param {Number} lat
   * @param {Number} lng
   */
  showPivot: function(lat, lng){
    this.pivot.setPosition(new google.maps.LatLng(lat,lng));
    this.pivot.setMap(this.map);
		this.pivot.setAnimation(google.maps.Animation.DROP);
  },

  /**
   * Hide pivot marker
   */
  hidePivot: function(){
    this.pivot.setMap(null);
  },

  /**
   * Show a marker in the specified address
   * @param {String} address
   */
  showAddress: function(address) {
    this.getAddress(address, function(location) {
      Map.map.setZoom(15);
      Map.map.setCenter(new google.maps.LatLng(location.lat, location.lng));
      Map.showPivot(location.lat, location.lng);
    });
  },

  /**
   * get the latitude and longitude from an address
   * @param {String} address
   * @param {Function} callback
   */
  getAddress: function(address, callback) {
    var geocoder = new google.maps.Geocoder();
    var location = {
      lat: '',
      lng: ''
    };
    geocoder.geocode( { 'address': address}, function(results, status) {
      if (status == google.maps.GeocoderStatus.OK) {
        location.lat = results[0].geometry.location.lat();
        location.lng = results[0].geometry.location.lng();
        callback(location);
      } else {
        console.log("Geocode was not successful for the following reason: " + status);
      }
    });
  },

  /**
   * fit all the markers in the map's viewport
   */
  fitMarkers: function() {
    var bounds = new google.maps.LatLngBounds ();
    for (var i = 0; i < this.markers.length; i++) {
			if (this.markers[i]) {
				bounds.extend (this.markers[i].position);	
			}
    }
    if (!bounds.isEmpty()) {
      if (this.markers.length < 2) {
        this.map.setCenter(bounds.getCenter());
        this.map.setZoom(12);
      } else {
        this.map.fitBounds(bounds);
      }
    }
  }

}
