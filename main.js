/**
 * Main JavaScript with jQuery and AJAX - FIXED
 * Correct API path for your setup
 */

$(document).ready(function() {
  let carsData = [];
  const API_BASE = 'api/'; // Works with your setup
  
  /**
   * Load cars from API using AJAX
   */
  function loadCarsFromAPI(format = 'json') {
    $.ajax({
      url: `${API_BASE}cars.php`,
      method: 'GET',
      data: { format: format },
      dataType: format === 'xml' ? 'xml' : 'json',
      beforeSend: function() {
        showLoader();
      },
      success: function(response) {
        console.log('✅ Cars loaded successfully:', response);
        
        if (format === 'xml') {
          carsData = parseXMLCars(response);
        } else {
          // Handle both response formats
          carsData = response.data?.cars || response.cars || [];
        }
        
        console.log('Total cars:', carsData.length);
        renderCars(carsData);
        hideLoader();
      },
      error: function(xhr, status, error) {
        console.error('❌ Error loading cars:', {
          status: xhr.status,
          statusText: xhr.statusText,
          error: error,
          responseText: xhr.responseText,
          url: `${API_BASE}cars.php`
        });
        
        showNotification('Failed to load cars. Please check console for details.', 'error');
        hideLoader();
      }
    });
  }
  
  /**
   * Parse XML response to JavaScript array
   */
  function parseXMLCars(xml) {
    const cars = [];
    $(xml).find('car').each(function() {
      const $car = $(this);
      cars.push({
        id: parseInt($car.find('id').text()),
        name: $car.find('name').text(),
        price: parseFloat($car.find('price').text()),
        description: $car.find('description').text(),
        image: $car.find('image').text(),
        year: parseInt($car.find('year').text()),
        transmission: $car.find('transmission').text(),
        fuel: $car.find('fuel').text(),
        seats: parseInt($car.find('seats').text()),
        type: $car.find('type').text(),
        available: $car.find('available').text() === 'true' || $car.find('available').text() === '1'
      });
    });
    return cars;
  }
  
  /**
   * Render cars to the grid
   */
  function renderCars(cars) {
    const $carGrid = $('.car-grid');
    $carGrid.empty();
    
    if (cars.length === 0) {
      $carGrid.html('<p class="no-results" style="text-align:center;color:#fff;padding:2rem;grid-column:1/-1;">No cars found matching your search.</p>');
      return;
    }
    
    cars.forEach(car => {
      const carCard = createCarCard(car);
      $carGrid.append(carCard);
    });
    
    // Attach event handlers
    attachCarEventHandlers();
  }
  
  /**
   * Create car card HTML
   */
  function createCarCard(car) {
    return `
      <div class="car-card" data-id="${car.id}">
        <img src="${car.image}" alt="${car.name}" onerror="this.src='images/placeholder.jpg'">
        <h3>${car.name}</h3>
        <p class="car-type">${car.type}</p>
        <div class="car-details">
          <span>${car.year}</span>
          <span>${car.transmission}</span>
          <span>${car.fuel}</span>
          <span>${car.seats} Seats</span>
        </div>
        <p class="car-price">$${car.price}<span>/day</span></p>
        <div class="car-buttons">
          <button class="rent-btn" data-id="${car.id}">Rent Now</button>
          <button class="details-btn" data-id="${car.id}">View Details</button>
        </div>
      </div>
    `;
  }
  
  /**
   * Attach event handlers to car buttons
   */
  function attachCarEventHandlers() {
    // Rent Now buttons
    $('.rent-btn').off('click').on('click', function() {
      const carId = $(this).data('id');
      window.location.href = `payment.html?id=${carId}`;
    });
    
    // View Details buttons
    $('.details-btn').off('click').on('click', function() {
      const carId = $(this).data('id');
      window.location.href = `car-details.html?id=${carId}`;
    });
  }
  
  /**
   * Search functionality with AJAX
   */
  $('#searchInput').on('input', function() {
    const searchQuery = $(this).val().trim().toLowerCase();
    
    if (searchQuery === '') {
      renderCars(carsData);
      return;
    }
    
    // Client-side filtering
    const filteredCars = carsData.filter(car => 
      car.name.toLowerCase().includes(searchQuery) ||
      car.type.toLowerCase().includes(searchQuery)
    );
    
    renderCars(filteredCars);
  });
  
  /**
   * Search button click - Server-side search
   */
  $('#searchBtn').on('click', function() {
    const searchQuery = $('#searchInput').val().trim();
    
    if (searchQuery === '') {
      loadCarsFromAPI();
      return;
    }
    
    $.ajax({
      url: `${API_BASE}cars.php`,
      method: 'GET',
      data: { 
        format: 'json',
        search: searchQuery 
      },
      dataType: 'json',
      success: function(response) {
        carsData = response.data?.cars || response.cars || [];
        renderCars(carsData);
      },
      error: function(xhr, status, error) {
        console.error('Search error:', error);
        showNotification('Search failed. Please try again.', 'error');
      }
    });
  });
  
  /**
   * Contact form submission with AJAX
   */
  $('#contactForm').on('submit', function(e) {
    e.preventDefault();
    
    const formData = {
      name: $(this).find('input[type="text"]').val().trim(),
      email: $(this).find('input[type="email"]').val().trim(),
      message: $(this).find('textarea').val().trim()
    };
    
    // Validate form
    if (!formData.name || !formData.email || !formData.message) {
      showNotification('Please fill in all fields', 'error');
      return;
    }
    
    $.ajax({
      url: `${API_BASE}contact.php`,
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify(formData),
      beforeSend: function() {
        $('#contactForm button').prop('disabled', true).text('Sending...');
      },
      success: function(response) {
        if (response.success) {
          showNotification('Message sent successfully!', 'success');
          $('#contactForm')[0].reset();
        } else {
          showNotification(response.message || 'Failed to send message', 'error');
        }
      },
      error: function(xhr, status, error) {
        console.error('Contact form error:', error);
        showNotification('Failed to send message. Please try again.', 'error');
      },
      complete: function() {
        $('#contactForm button').prop('disabled', false).text('Send Message');
      }
    });
  });
  
  /**
   * Show notification/toast message
   */
  function showNotification(message, type = 'info') {
    const colors = {
      success: '#28a745',
      error: '#dc3545',
      info: '#17a2b8',
      warning: '#ffc107'
    };
    
    const $notification = $('<div class="notification"></div>')
      .addClass(`notification-${type}`)
      .text(message)
      .css({
        position: 'fixed',
        bottom: '30px',
        right: '30px',
        padding: '15px 20px',
        backgroundColor: colors[type],
        color: 'white',
        fontSize: '16px',
        fontWeight: 'bold',
        borderRadius: '8px',
        boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
        opacity: 0,
        zIndex: 9999,
        transition: 'opacity 0.4s'
      });
    
    $('body').append($notification);
    
    setTimeout(() => $notification.css('opacity', 1), 10);
    
    setTimeout(() => {
      $notification.css('opacity', 0);
      setTimeout(() => $notification.remove(), 400);
    }, 3000);
  }
  
  /**
   * Show/hide loader
   */
  function showLoader() {
    if ($('#loader').length === 0) {
      $('body').append('<div id="loader" class="loader" style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);color:#fff;font-size:1.5rem;z-index:9999;">Loading...</div>');
    }
    $('#loader').show();
  }
  
  function hideLoader() {
    $('#loader').hide();
  }
  
  /**
   * Smooth scrolling for navigation links
   */
  $('nav a[href^="#"]').on('click', function(e) {
    e.preventDefault();
    const target = $(this.getAttribute('href'));
    
    if (target.length) {
      $('html, body').stop().animate({
        scrollTop: target.offset().top - 80
      }, 800);
    }
  });
  
  // Initialize - Load cars on page load
  console.log('🚀 Initializing DriveNow...');
  loadCarsFromAPI('json');
  
  // Example: Toggle between JSON and XML formats
  window.toggleDataFormat = function(format) {
    console.log('Switching to format:', format);
    loadCarsFromAPI(format);
  };
});