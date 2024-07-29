let startMarker, destMarker, routeControl;
let map;

function toggleTheme() {
    console.log('toggleTheme called');
    const currentTheme = document.documentElement.getAttribute("data-theme");
    const newTheme = currentTheme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem('theme', newTheme); // Save the theme to localStorage
    updateThemeIcon();
}

function updateThemeIcon() {
    console.log('updateThemeIcon called');
    const currentTheme = document.documentElement.getAttribute("data-theme");
    const themeIcon = document.getElementById("theme-icon");
    if (currentTheme === "dark") {
        themeIcon.classList.remove("fa-sun");
        themeIcon.classList.add("fa-moon");
    } else {
        themeIcon.classList.remove("fa-moon");
        themeIcon.classList.add("fa-sun");
    }
}

function showDestinationSection() {
    console.log('showDestinationSection called');
    const button = document.querySelector('.get-started-button');
    const icon = button.querySelector('.fas');
    const text = button.querySelector('span');
    const heroText = document.querySelectorAll('.hero h2, .hero p');
    const heroSection = document.querySelector('.hero');
    const destinationSection = document.getElementById('destination-section');

    // Add "driving" class to trigger the animation
    button.classList.add('driving');

    // Remove the "GO!" text
    text.classList.add('disappear');

    // Hide the welcome text
    heroText.forEach(element => element.classList.add('hidden'));

    icon.addEventListener('animationend', () => {
        // Hide the hero section and show the destination section
        heroSection.classList.add('hidden');
        destinationSection.style.display = 'block';
        destinationSection.classList.add('visible');

        // Ensure map size does not change
        const mapContainer = document.getElementById('map-container');
        mapContainer.style.height = `${mapContainer.offsetHeight}px`;

        // Scroll into view smoothly, if needed
        destinationSection.scrollIntoView({ behavior: 'smooth' });
    });
}

function showMapOrMessage(latitude, longitude, map) {
    console.log(`showMapOrMessage called with latitude: ${latitude}, longitude: ${longitude}`);
    const mapContainer = document.getElementById('map-container');
    const message = document.getElementById('unavailable-message');

    if (isLocationInEurope(latitude, longitude)) {
        mapContainer.style.display = 'block';
        message.style.display = 'none';
        map.setView([latitude, longitude], 10);
    } else {
        mapContainer.style.display = 'none';
        message.style.display = 'block';
    }
}

function isLocationInEurope(lat, lon) {
    return lat >= 34.0 && lat <= 72.0 && lon >= -25.0 && lon <= 45.0;
}

function getLocationSuggestions(event, type) {
    console.log(`getLocationSuggestions called with type: ${type}`);
    const query = event.target.value;
    const dataList = document.getElementById(`${type === 'start' ? 'start-point-list' : 'destination-list'}`);

    if (query === '') {
        dataList.innerHTML = '';
        return;
    }

    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=5&bounded=1&viewbox=-25.0,72.0,45.0,34.0`;

    fetch(url)
        .then(response => response.json())
        .then(data => {
            dataList.innerHTML = '';
            data.forEach(place => {
                const option = document.createElement('option');
                option.value = place.display_name;
                dataList.appendChild(option);
            });
        });
}

function addMarkersAndFetchRoute() {
    console.log('addMarkersAndFetchRoute called');
    const startPoint = document.getElementById('start-point').value;
    const destination = document.getElementById('destination').value;

    if (!startPoint || !destination) {
        alert('Please enter both start point and destination.');
        return;
    }

    const startGeocodeUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(startPoint)}&format=json&addressdetails=1&limit=1`;
    const destGeocodeUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(destination)}&format=json&addressdetails=1&limit=1`;

    Promise.all([
        fetch(startGeocodeUrl).then(response => response.json()),
        fetch(destGeocodeUrl).then(response => response.json())
    ]).then(([startData, destData]) => {
        if (startData.length > 0 && destData.length > 0) {
            const startLatLng = [startData[0].lat, startData[0].lon];
            const destLatLng = [destData[0].lat, destData[0].lon];

            const startIcon = L.icon({
                iconUrl: 'img/start-icon.png',
                iconSize: [32, 32],
                iconAnchor: [16, 32],
                popupAnchor: [0, -32]
            });

            const destIcon = L.icon({
                iconUrl: 'img/destination-icon.png',
                iconSize: [32, 32],
                iconAnchor: [16, 32],
                popupAnchor: [0, -32]
            });

            if (startMarker) {
                map.removeLayer(startMarker);
            }
            if (destMarker) {
                map.removeLayer(destMarker);
            }
            if (routeControl) {
                map.removeControl(routeControl);
            }

            startMarker = L.marker(startLatLng, { icon: startIcon }).addTo(map).bindPopup('Start Point').openPopup();
            destMarker = L.marker(destLatLng, { icon: destIcon }).addTo(map).bindPopup('Destination').openPopup();

            fetchRoute(startLatLng, destLatLng);
        } else {
            alert('Unable to geocode one or both locations.');
        }
    });
}

function fetchRoute(startLatLng, destLatLng) {
    console.log('fetchRoute called');
    if (routeControl) {
        map.removeControl(routeControl);
    }

    routeControl = L.Routing.control({
        waypoints: [
            L.latLng(startLatLng),
            L.latLng(destLatLng)
        ],
        createMarker: function(i, waypoint, n) {
            const iconUrl = i === 0 ? 'img/start-icon.png' : 'img/destination-icon.png';
            return L.marker(waypoint.latLng, {
                icon: L.icon({
                    iconUrl: iconUrl,
                    iconSize: [32, 32],
                    iconAnchor: [16, 32],
                    popupAnchor: [0, -32]
                })
            });
        },
        routeWhileDragging: false, // Disable dragging waypoints
        show: false, // Disable the default turn-by-turn navigation
        addWaypoints: false // Disable adding waypoints by clicking on the map
    }).addTo(map);

    routeControl.on('routesfound', function(e) {
        const routes = e.routes;
        const summary = routes[0].summary;
        console.log(`Route found: ${summary.totalDistance / 1000} km, ${summary.totalTime / 60} minutes`);
    });

    routeControl.on('routingerror', function() {
        alert('Unable to find a route between the start point and destination. Please choose a different destination.');
    });
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOMContentLoaded event fired');
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        document.documentElement.setAttribute("data-theme", savedTheme);
    }
    updateThemeIcon();

    map = L.map('map', {
        center: [54.5260, 15.2551],
        zoom: 4,
        zoomControl: true, // Ensure zoom controls are enabled
        scrollWheelZoom: true, // Allow zooming with scroll wheel
        doubleClickZoom: true, // Allow double click zoom
        dragging: false, // Disable dragging of the map
        maxBounds: [[34.0, -25.0], [72.0, 45.0]],
        maxBoundsViscosity: 1.0
    });

    L.tileLayer('https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=i8vlNPFiy59ojUm838NB', {
        minZoom: 4,
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.maptiler.com/copyright/">MapTiler</a> contributors, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    map.on('click', function(e) {
        // Prevent users from adding points by clicking on the map
        e.originalEvent.preventDefault();
    });

    // Request user's location
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            function(position) {
                const latitude = position.coords.latitude;
                const longitude = position.coords.longitude;
                console.log(`Latitude: ${latitude}, Longitude: ${longitude}`);
                showMapOrMessage(latitude, longitude, map);
                map.setView([latitude, longitude], 10);
            },
            function(error) {
                console.error(`Error obtaining location: ${error.message}`);
            },
            {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0
            }
        );
    } else {
        console.error('Geolocation is not supported by this browser.');
    }
});