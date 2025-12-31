/**
 * Payment Page JavaScript - FIXED
 * Correct API path
 */

$(document).ready(function() {
  const API_BASE = 'api/';
  let currentCar = null;
  
  /**
   * Load car details
   */
  function loadCarDetails() {
    const params = new URLSearchParams(window.location.search);
    const carId = params.get('id');
    
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
        const cars = response.data?.cars || response.cars || [];
        
        if (cars.length > 0) {
          currentCar = cars[0];
          displayCarDetails(currentCar);
        } else {
          showNotification('Car not found', 'error');
          setTimeout(() => window.location.href = 'index.html', 2000);
        }
        hideLoader();
      },
      error: function(xhr, status, error) {
        console.error('Error loading car:', error);
        showNotification('Failed to load car details', 'error');
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
    $('#pay-amount').text(car.price);
  }
  
  /**
   * Initialize Stripe
   */
  const stripe = Stripe('pk_test_51SVG2kBi5o9XwiiPvIdLdZGolEewq3lKOPKX58WvOopBSCpsyDIByCFrYmT3x9nARqfiV51v6AM0KfQvfmSXXYB700G1AxiOts');
  const elements = stripe.elements();
  const cardElement = elements.create('card', {
    style: {
      base: {
        color: '#fff',
        fontSize: '16px',
        '::placeholder': { color: '#aaa' }
      },
      invalid: { color: '#FF5000' }
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
    
    const customerName = $('#customer-name').val().trim();
    const customerEmail = $('#customer-email').val().trim();
    const customerPhone = $('#customer-phone').val().trim();
    
    if (!customerName || !customerEmail || !customerPhone) {
      showNotification('Please fill in all fields', 'error');
      return;
    }
    
    const $submitBtn = $('#submit-payment');
    $submitBtn.prop('disabled', true).text('Processing...');
    
    try {
      const { error, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
        billing_details: {
          name: customerName,
          email: customerEmail,
          phone: customerPhone
        }
      });
      
      if (error) {
        throw new Error(error.message);
      }
      
      const paymentData = {
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        car_id: currentCar.id,
        rental_days: 1,
        payment_method_id: paymentMethod.id,
        amount: currentCar.price
      };
      
      $.ajax({
        url: `${API_BASE}payment.php?format=json`,
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(paymentData),
        dataType: 'json',
        success: function(response) {
          if (response.success) {
            showNotification('Payment successful!', 'success');
            $('#payment-message')
              .text(`✅ Payment successful! Booking ID: ${response.data.booking_id}`)
              .css('color', 'green');
            
            setTimeout(() => {
              window.location.href = 'index.html';
            }, 3000);
          } else {
            showNotification(response.message, 'error');
            $('#payment-message')
              .text(`❌ ${response.message}`)
              .css('color', 'red');
          }
        },
        error: function(xhr, status, error) {
          console.error('Payment submission error:', error);
          showNotification('Payment failed. Please try again.', 'error');
          $('#payment-message')
            .text('❌ Payment failed. Please try again.')
            .css('color', 'red');
        },
        complete: function() {
          $submitBtn.prop('disabled', false).text(`Pay $${currentCar.price}`);
        }
      });
      
    } catch (error) {
      console.error('Payment error:', error);
      showNotification(error.message, 'error');
      $submitBtn.prop('disabled', false).text(`Pay $${currentCar.price}`);
    }
  });
  
  function showNotification(message, type = 'info') {
    const colors = {
      success: '#28a745',
      error: '#dc3545',
      info: '#17a2b8',
      warning: '#ffc107'
    };
    
    const $notification = $('<div></div>')
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
  
  function showLoader() {
    if ($('#loader').length === 0) {
      $('body').append('<div id="loader" class="loader" style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);color:#fff;font-size:1.5rem;z-index:9999;">Loading...</div>');
    }
    $('#loader').show();
  }
  
  function hideLoader() {
    $('#loader').hide();
  }
  
  loadCarDetails();
});