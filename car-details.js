/**
 * Car Details Page JavaScript - FIXED
 * Correct API path and error handling
 */

$(document).ready(function() {
  const API_BASE = 'api/'; // Correct path
  let currentCar = null;
  
  /**
   * Load car details from API
   */
  function loadCarDetails() {
    const params = new URLSearchParams(window.location.search);
    const carId = params.get('id');
    
    console.log('Loading car ID:', carId);
    
    if (!carId) {
      showNotification('Invalid car ID', 'error');
      setTimeout(() => window.location.href = 'index.html', 2000);
      return;
    }
    
    $.ajax({
      url: `${API_BASE}cars.php`,
      method: 'GET',
      data: { 
        id: carId,
        format: 'json'
      },
      dataType: 'json',
      beforeSend: function() {
        showLoader();
      },
      success: function(response) {
        console.log('API Response:', response);
        
        // Handle different response formats
        const cars = response.data?.cars || response.cars || [];
        
        if (cars.length > 0) {
          currentCar = cars[0];
          console.log('Car loaded:', currentCar);
          displayCarDetails(currentCar);
        } else {
          console.error('No car found in response');
          showNotification('Car not found', 'error');
          setTimeout(() => window.location.href = 'index.html', 2000);
        }
        hideLoader();
      },
      error: function(xhr, status, error) {
        console.error('Error loading car:', {
          status: xhr.status,
          statusText: xhr.statusText,
          error: error,
          responseText: xhr.responseText
        });
        showNotification('Failed to load car details', 'error');
        setTimeout(() => window.location.href = 'index.html', 2000);
        hideLoader();
      }
    });
  }
  
  /**
   * Display car details
   */
  function displayCarDetails(car) {
    $('#car-name').text(car.name);
    $('#car-image').attr('src', car.image).attr('alt', car.name);
    $('#car-description').text(car.description);
    $('#car-price').text(`$${car.price}/day`);
    $('#total-payment').text(car.price);
    
    console.log('Car details displayed');
  }
  
  /**
   * Show/hide payment form
   */
  $('#rentBtn').on('click', function() {
    if (!currentCar) {
      showNotification('Please wait for car details to load', 'error');
      return;
    }
    $('#payment-form-container').slideDown(400);
    $(this).fadeOut(300);
    updateTotalPrice();
  });
  
  /**
   * Update total price based on rental days
   */
  $('#rental-days').on('input', function() {
    updateTotalPrice();
  });
  
  function updateTotalPrice() {
    if (!currentCar) return;
    
    const days = parseInt($('#rental-days').val()) || 1;
    const total = currentCar.price * days;
    $('#total-payment').text(total);
  }
  
  /**
   * Initialize Stripe
   */
  const stripe = Stripe('pk_test_51SZf2V5ZJKj6DfSbhRQHhiou3VcZn81ElcLbkTt0gvgo9PNLg3tQJO1zbkYcMpIOeTKHMgSd8nycrbPCCql4AmRY00xapvce9S');
  const elements = stripe.elements();
  const cardElement = elements.create('card', {
    style: {
      base: {
        color: '#fff',
        fontSize: '16px',
        '::placeholder': { color: '#aaa' }
      },
      invalid: { color: '#D4AF37' }
    }
  });
  cardElement.mount('#card-element');
  
  /**
   * Handle payment form submission
   */
  $('#payment-form').on('submit', async function(e) {
    e.preventDefault();
    
    if (!currentCar) {
      showNotification('Car information not loaded', 'error');
      return;
    }
    
    // Get form data
    const formData = {
      customer_name: $('#customer-name').val().trim(),
      customer_email: $('#customer-email').val().trim(),
      customer_phone: $('#customer-phone').val().trim(),
      rental_days: parseInt($('#rental-days').val()) || 1
    };
    
    // Validate
    if (!formData.customer_name || !formData.customer_email || 
        !formData.customer_phone || formData.rental_days < 1) {
      showNotification('Please fill all fields correctly', 'error');
      $('#payment-message').text('❌ Please fill all fields correctly!').css('color', 'red');
      return;
    }
    
    const $submitBtn = $('#submit-payment');
    $submitBtn.prop('disabled', true).text('Processing...');
    
    try {
      // Create payment method with Stripe
      const { error, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
        billing_details: {
          name: formData.customer_name,
          email: formData.customer_email,
          phone: formData.customer_phone
        }
      });
      
      if (error) {
        throw new Error(error.message);
      }
      
      // Prepare payment data
      const paymentData = {
        customer_name: formData.customer_name,
        customer_email: formData.customer_email,
        customer_phone: formData.customer_phone,
        car_id: currentCar.id,
        rental_days: formData.rental_days,
        payment_method_id: paymentMethod.id,
        amount: currentCar.price * formData.rental_days
      };
      
      console.log('Submitting payment:', paymentData);
      
      // Submit to backend
      $.ajax({
        url: `${API_BASE}payment.php?format=json`,
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(paymentData),
        dataType: 'json',
        success: function(response) {
          console.log('Payment response:', response);
          
          if (response.success) {
            const total = currentCar.price * formData.rental_days;
            showNotification('Payment successful!', 'success');
            $('#payment-message')
              .html(`✅ Payment successful for ${currentCar.name} ($${total})!<br>
                     Booking ID: ${response.data.booking_id}<br>
                     Customer: ${formData.customer_name}, ${formData.customer_email}`)
              .css('color', 'green');
            
            // Disable form
            $('#payment-form input').prop('disabled', true);
            cardElement.update({ disabled: true });
            
            // Redirect after 5 seconds
            setTimeout(() => {
              window.location.href = 'index.html';
            }, 5000);
          } else {
            throw new Error(response.message || 'Payment failed');
          }
        },
        error: function(xhr, status, error) {
          console.error('Payment error:', xhr.responseText);
          let errorMessage = 'Payment failed. Please try again.';
          try {
            const response = JSON.parse(xhr.responseText);
            errorMessage = response.message || errorMessage;
          } catch (e) {
            console.error('Parse error:', e);
          }
          
          showNotification(errorMessage, 'error');
          $('#payment-message').text(`❌ ${errorMessage}`).css('color', 'red');
          $submitBtn.prop('disabled', false).text(`Pay $${$('#total-payment').text()}`);
        }
      });
      
    } catch (error) {
      console.error('Payment error:', error);
      showNotification(error.message, 'error');
      $('#payment-message').text(`❌ ${error.message}`).css('color', 'red');
      $submitBtn.prop('disabled', false).text(`Pay $${$('#total-payment').text()}`);
    }
  });
  
  /**
   * Show notification
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
   * Loader functions
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
  
  // Initialize
  console.log('Initializing car details page...');
  loadCarDetails();
});