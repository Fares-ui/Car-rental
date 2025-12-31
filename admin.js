/**
 * FIXED Admin Dashboard JavaScript
 * - Working edit functionality with modal
 * - Loads and displays bookings from database
 * - Proper authentication check
 */

$(document).ready(function() {
  const API_BASE = '/web/api/';
  
  // CHECK AUTHENTICATION
  checkAuthentication();
  
  // Load initial data
  loadDashboardStats();
  loadCars();
  loadBookings();
  
  // Tab switching
  window.showTab = function(tabName) {
    $('.tab-content').removeClass('active');
    $('.tab-btn').removeClass('active');
    $(`#${tabName}-tab`).addClass('active');
    
    $('.tab-btn').each(function() {
      const btnText = $(this).text().toLowerCase();
      if (btnText.includes(tabName.toLowerCase())) {
        $(this).addClass('active');
      }
    });
    
    // Load data when switching tabs
    if (tabName === 'bookings') {
      loadBookings();
    }
  };
  
  /**
   * Check authentication
   */
  function checkAuthentication() {
    const isAuthenticated = sessionStorage.getItem('adminAuthenticated');
    const username = sessionStorage.getItem('adminUsername');
    
    if (isAuthenticated !== 'true' || !username) {
      alert('Please login first!');
      window.location.href = 'admin-login.html';
      return;
    }
    
    $('.user-info strong').text(username);
  }
  
  /**
   * Load dashboard statistics
   */
  function loadDashboardStats() {
    $.ajax({
      url: `${API_BASE}cars.php?format=json`,
      method: 'GET',
      success: function(response) {
        const cars = response.data?.cars || response.cars || [];
        const totalCars = cars.length;
        $('#totalCars').text(totalCars);
        
        const availableCars = cars.filter(c => c.available == 1 || c.available === true).length;
        const activeRentals = totalCars - availableCars;
        $('#activeRentals').text(activeRentals);
        
        // Load bookings for stats
        $.ajax({
          url: `${API_BASE}bookings.php?format=json`,
          method: 'GET',
          success: function(bookingResponse) {
            const bookings = bookingResponse.data?.bookings || [];
            $('#totalBookings').text(bookings.length);
            
            const totalRevenue = bookings.reduce((sum, b) => sum + parseFloat(b.total_amount || 0), 0);
            $('#totalRevenue').text('$' + Math.round(totalRevenue).toLocaleString());
          }
        });
      },
      error: function() {
        showNotification('Failed to load dashboard stats', 'error');
      }
    });
  }
  
  /**
   * Load cars table
   */
  function loadCars() {
    $.ajax({
      url: `${API_BASE}cars.php?format=json`,
      method: 'GET',
      success: function(response) {
        const tbody = $('#carsTableBody');
        tbody.empty();
        
        const cars = response.data?.cars || response.cars || [];
        
        if (cars.length > 0) {
          cars.forEach(car => {
            const available = car.available == 1 || car.available === true;
            const statusClass = available ? 'status-completed' : 'status-pending';
            const statusText = available ? 'Available' : 'Rented';
            
            tbody.append(`
              <tr data-id="${car.id}">
                <td>${car.id}</td>
                <td><img src="${car.image}" alt="${car.name}" onerror="this.src='images/placeholder.jpg'" style="width:60px;height:40px;object-fit:cover;border-radius:5px;"></td>
                <td><strong>${car.name}</strong></td>
                <td>${car.type}</td>
                <td><strong>$${car.price}/day</strong></td>
                <td>${car.year}</td>
                <td>${car.seats}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td class="action-buttons">
                  <button class="btn-edit" onclick="editCar(${car.id})">Edit</button>
                  <button class="btn-delete" onclick="deleteCar(${car.id})">Delete</button>
                </td>
              </tr>
            `);
          });
        } else {
          tbody.html('<tr><td colspan="9" style="text-align: center; padding: 2rem;">No cars found</td></tr>');
        }
      },
      error: function() {
        showNotification('Failed to load cars', 'error');
      }
    });
  }
  
  /**
   * Load bookings table
   */
  function loadBookings() {
    $.ajax({
      url: `${API_BASE}bookings.php?format=json`,
      method: 'GET',
      success: function(response) {
        const tbody = $('#bookingsTableBody');
        tbody.empty();
        
        const bookings = response.data?.bookings || [];
        
        if (bookings.length > 0) {
          bookings.forEach(booking => {
            const statusClass = booking.booking_status === 'confirmed' ? 'status-completed' : 
                               booking.booking_status === 'pending' ? 'status-pending' : 'status-cancelled';
            
            tbody.append(`
              <tr>
                <td><strong>${booking.booking_id}</strong></td>
                <td>${booking.customer_name}<br><small>${booking.customer_email}</small></td>
                <td>${booking.car_name}</td>
                <td>${booking.start_date}</td>
                <td>${booking.rental_days}</td>
                <td><strong>$${parseFloat(booking.total_amount).toFixed(2)}</strong></td>
                <td><span class="status-badge ${statusClass}">${booking.booking_status}</span></td>
                <td class="action-buttons">
                  <button class="btn-edit" onclick="viewBookingDetails('${booking.booking_id}')">View</button>
                </td>
              </tr>
            `);
          });
        } else {
          tbody.html('<tr><td colspan="8" style="text-align: center; padding: 2rem; color: #999;">No bookings yet</td></tr>');
        }
      },
      error: function() {
        showNotification('Failed to load bookings', 'error');
      }
    });
  }
  
  /**
   * View booking details
   */
  window.viewBookingDetails = function(bookingId) {
    $.ajax({
      url: `${API_BASE}bookings.php?booking_id=${bookingId}&format=json`,
      method: 'GET',
      success: function(response) {
        const booking = response.data?.booking;
        if (booking) {
          alert(`Booking Details:
Booking ID: ${booking.booking_id}
Customer: ${booking.customer_name}
Email: ${booking.customer_email}
Phone: ${booking.customer_phone}
Car: ${booking.car_name}
Rental Days: ${booking.rental_days}
Start Date: ${booking.start_date}
End Date: ${booking.end_date}
Total Amount: $${booking.total_amount}
Payment Status: ${booking.payment_status}
Booking Status: ${booking.booking_status}`);
        }
      }
    });
  };
  
  /**
   * Add car form submission
   */
  $('#addCarForm').on('submit', function(e) {
    e.preventDefault();
    
    const formData = {
      name: $('input[name="name"]').val(),
      type: $('select[name="type"]').val(),
      price: parseFloat($('input[name="price"]').val()),
      year: parseInt($('input[name="year"]').val()),
      transmission: $('select[name="transmission"]').val(),
      fuel: $('select[name="fuel"]').val(),
      seats: parseInt($('input[name="seats"]').val()),
      image: $('input[name="image"]').val(),
      description: $('textarea[name="description"]').val(),
      available: true
    };
    
    $.ajax({
      url: `${API_BASE}cars.php?format=json`,
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify(formData),
      success: function(response) {
        showNotification('Car added successfully!', 'success');
        $('#addCarForm')[0].reset();
        loadCars();
        loadDashboardStats();
      },
      error: function() {
        showNotification('Failed to add car', 'error');
      }
    });
  });
  
  /**
   * Edit car function with modal
   */
  window.editCar = function(id) {
    // Get car data
    $.ajax({
      url: `${API_BASE}cars.php?id=${id}&format=json`,
      method: 'GET',
      success: function(response) {
        const cars = response.data?.cars || response.cars || [];
        const car = cars[0];
        
        if (!car) {
          showNotification('Car not found', 'error');
          return;
        }
        
        // Create edit modal
        const modal = $(`
          <div class="modal-overlay" id="editModal">
            <div class="modal-content">
              <h2>Edit Car: ${car.name}</h2>
              <form id="editCarForm">
                <input type="hidden" id="edit-car-id" value="${car.id}">
                <div class="form-group">
                  <label>Car Name</label>
                  <input type="text" id="edit-name" value="${car.name}" required>
                </div>
                <div class="form-group">
                  <label>Type</label>
                  <select id="edit-type" required>
                    <option value="Luxury Sedan" ${car.type === 'Luxury Sedan' ? 'selected' : ''}>Luxury Sedan</option>
                    <option value="Luxury SUV" ${car.type === 'Luxury SUV' ? 'selected' : ''}>Luxury SUV</option>
                    <option value="Muscle Car" ${car.type === 'Muscle Car' ? 'selected' : ''}>Muscle Car</option>
                    <option value="Supercar" ${car.type === 'Supercar' ? 'selected' : ''}>Supercar</option>
                    <option value="Sports Car" ${car.type === 'Sports Car' ? 'selected' : ''}>Sports Car</option>
                    <option value="Electric" ${car.type === 'Electric' ? 'selected' : ''}>Electric</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Price ($/day)</label>
                  <input type="number" id="edit-price" value="${car.price}" required min="0" step="0.01">
                </div>
                <div class="form-group">
                  <label>Year</label>
                  <input type="number" id="edit-year" value="${car.year}" required min="2000" max="2030">
                </div>
                <div class="form-group">
                  <label>Transmission</label>
                  <select id="edit-transmission" required>
                    <option value="Automatic" ${car.transmission === 'Automatic' ? 'selected' : ''}>Automatic</option>
                    <option value="Manual" ${car.transmission === 'Manual' ? 'selected' : ''}>Manual</option>
                    <option value="Automatic/Manual" ${car.transmission === 'Automatic/Manual' ? 'selected' : ''}>Automatic/Manual</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Fuel Type</label>
                  <select id="edit-fuel" required>
                    <option value="Petrol" ${car.fuel === 'Petrol' ? 'selected' : ''}>Petrol</option>
                    <option value="Diesel" ${car.fuel === 'Diesel' ? 'selected' : ''}>Diesel</option>
                    <option value="Electric" ${car.fuel === 'Electric' ? 'selected' : ''}>Electric</option>
                    <option value="Hybrid" ${car.fuel === 'Hybrid' ? 'selected' : ''}>Hybrid</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Seats</label>
                  <input type="number" id="edit-seats" value="${car.seats}" required min="2" max="9">
                </div>
                <div class="form-group">
                  <label>Image URL</label>
                  <input type="text" id="edit-image" value="${car.image}" required>
                </div>
                <div class="form-group">
                  <label>Description</label>
                  <textarea id="edit-description" required>${car.description}</textarea>
                </div>
                <div class="form-group">
                  <label>
                    <input type="checkbox" id="edit-available" ${car.available ? 'checked' : ''}>
                    Available for rent
                  </label>
                </div>
                <div class="form-actions">
                  <button type="button" class="btn-secondary" onclick="closeEditModal()">Cancel</button>
                  <button type="submit" class="btn-primary">Update Car</button>
                </div>
              </form>
            </div>
          </div>
        `);
        
        $('body').append(modal);
        
        // Handle form submission
        $('#editCarForm').on('submit', function(e) {
          e.preventDefault();
          
          const updateData = {
            id: parseInt($('#edit-car-id').val()),
            name: $('#edit-name').val(),
            type: $('#edit-type').val(),
            price: parseFloat($('#edit-price').val()),
            year: parseInt($('#edit-year').val()),
            transmission: $('#edit-transmission').val(),
            fuel: $('#edit-fuel').val(),
            seats: parseInt($('#edit-seats').val()),
            image: $('#edit-image').val(),
            description: $('#edit-description').val(),
            available: $('#edit-available').is(':checked') ? 1 : 0
          };
          
          $.ajax({
            url: `${API_BASE}cars.php?format=json`,
            method: 'PUT',
            contentType: 'application/json',
            data: JSON.stringify(updateData),
            success: function(response) {
              showNotification('Car updated successfully!', 'success');
              closeEditModal();
              loadCars();
              loadDashboardStats();
            },
            error: function() {
              showNotification('Failed to update car', 'error');
            }
          });
        });
      },
      error: function() {
        showNotification('Failed to load car data', 'error');
      }
    });
  };
  
  /**
   * Close edit modal
   */
  window.closeEditModal = function() {
    $('#editModal').remove();
  };
  
  /**
   * Delete car function
   */
  window.deleteCar = function(id) {
    if (confirm('Are you sure you want to delete this car?')) {
      $.ajax({
        url: `${API_BASE}cars.php?id=${id}&format=json`,
        method: 'DELETE',
        success: function(response) {
          showNotification('Car deleted successfully!', 'success');
          loadCars();
          loadDashboardStats();
        },
        error: function() {
          showNotification('Failed to delete car', 'error');
        }
      });
    }
  };
  
  /**
   * Search functionality
   */
  $('#carSearch').on('input', function() {
    const searchTerm = $(this).val().toLowerCase();
    $('#carsTable tbody tr').each(function() {
      const text = $(this).text().toLowerCase();
      $(this).toggle(text.includes(searchTerm));
    });
  });
  
  /**
   * Filter by type
   */
  $('#carTypeFilter').on('change', function() {
    const type = $(this).val();
    if (type === '') {
      $('#carsTable tbody tr').show();
    } else {
      $('#carsTable tbody tr').each(function() {
        const carType = $(this).find('td:nth-child(4)').text();
        $(this).toggle(carType === type);
      });
    }
  });
  
  /**
   * Reset form
   */
  window.resetForm = function() {
    $('#addCarForm')[0].reset();
  };
  
  /**
   * Logout function
   */
  window.logout = function() {
    if (confirm('Are you sure you want to logout?')) {
      sessionStorage.removeItem('adminAuthenticated');
      sessionStorage.removeItem('adminUsername');
      sessionStorage.removeItem('loginTime');
      
      showNotification('Logged out successfully!', 'success');
      
      setTimeout(() => {
        window.location.href = 'admin-login.html';
      }, 1000);
    }
  };
  
  /**
   * Notification system
   */
  function showNotification(message, type = 'info') {
    const colors = {
      success: '#28a745',
      error: '#dc3545',
      info: '#17a2b8',
      warning: '#ffc107'
    };
    
    const $notification = $('<div class="notification"></div>')
      .text(message)
      .css({
        position: 'fixed',
        top: '20px',
        right: '20px',
        padding: '1rem 1.5rem',
        background: colors[type],
        color: '#fff',
        borderRadius: '10px',
        boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
        zIndex: 10000,
        opacity: 0,
        transition: 'opacity 0.3s'
      });
    
    $('body').append($notification);
    setTimeout(() => $notification.css('opacity', 1), 10);
    
    setTimeout(() => {
      $notification.css('opacity', 0);
      setTimeout(() => $notification.remove(), 300);
    }, 3000);
  }
});

// Add modal styles
$('<style>')
  .text(`
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
    }
    .modal-content {
      background: #1a1a2e;
      padding: 2rem;
      border-radius: 15px;
      max-width: 600px;
      width: 90%;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 10px 40px rgba(0,0,0,0.5);
    }
    .modal-content h2 {
      color: #fff;
      margin-bottom: 1.5rem;
      text-align: center;
    }
    .modal-content .form-group {
      margin-bottom: 1rem;
    }
    .modal-content .form-group label {
      display: block;
      color: #fff;
      margin-bottom: 0.5rem;
      font-weight: 600;
    }
    .modal-content .form-group input,
    .modal-content .form-group select,
    .modal-content .form-group textarea {
      width: 100%;
      padding: 0.8rem;
      border: 2px solid #2a2a40;
      border-radius: 8px;
      background: #16213e;
      color: #fff;
      font-size: 1rem;
    }
    .modal-content .form-group textarea {
      min-height: 80px;
      resize: vertical;
    }
    .modal-content .form-actions {
      display: flex;
      gap: 1rem;
      margin-top: 1.5rem;
    }
    .modal-content .btn-primary,
    .modal-content .btn-secondary {
      flex: 1;
      padding: 0.8rem;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s;
    }
    .modal-content .btn-primary {
      background: #FF5000;
      color: #fff;
    }
    .modal-content .btn-primary:hover {
      background: #cc4000;
    }
    .modal-content .btn-secondary {
      background: #555;
      color: #fff;
    }
    .modal-content .btn-secondary:hover {
      background: #777;
    }
  `)
  .appendTo('head');