async function loadDashboard() {
    await Promise.all([loadRooms(), loadStats()]);
}

async function loadRooms() {
    try {
        const response = await fetch('api.php?action=rooms');
        const rooms = await response.json();
        const container = document.getElementById('rooms-container');
        
        container.innerHTML = rooms.map(room => `
            <div class="col-xl-3 col-lg-4 col-md-6 mb-4">
                <div class="card h-100 status-${room.status}">
                    <div class="card-body d-flex flex-column">
                        <h5 class="card-title">${room.room_number}</h5>
                        <p class="card-text fw-bold">${room.type}</p>
                        <p class="text-success fs-4">$${room.price}/night</p>
                        <p class="text-muted mb-auto">Status: <span class="badge bg-${room.status === 'available' ? 'success' : 'danger'}">${room.status}</span></p>
                        ${room.status === 'available' ? 
                            `<button class="btn btn-primary btn-book mt-auto w-100" 
                                     onclick="showBookingForm(${room.id}, '${room.room_number}', '${room.type}', ${room.price})">
                                Book Now
                            </button>` : 
                            `<div class="mt-auto text-center">
                                <span class="badge fs-6 bg-secondary w-100 py-2">Unavailable</span>
                            </div>`
                        }
                    </div>
                </div>
            </div>
        `).join('');
    } catch(error) {
        console.error('Error loading rooms:', error);
    }
}

async function loadStats() {
    try {
        const response = await fetch('api.php?action=stats');
        const stats = await response.json();
        const container = document.getElementById('stats-container') || document.getElementById('stats');
        
        const totalRooms = stats.reduce((sum, stat) => sum + stat.count, 0);
        const available = stats.find(s => s.status === 'available')?.count || 0;
        
        container.innerHTML = `
            <div class="row g-3">
                <div class="col-md-6">
                    <div class="card stats-card h-100">
                        <div class="card-body">
                            <h3>${available}</h3>
                            <p class="fs-5">Available Rooms</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="card stats-card h-100" style="background: linear-gradient(45deg, #dc3545, #c82333);">
                        <div class="card-body">
                            <h3>${totalRooms - available}</h3>
                            <p class="fs-5">Booked Rooms</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    } catch(error) {
        console.error('Error loading stats:', error);
    }
}

function showBookingForm(roomId, roomNumber, roomType, price) {
    const container = document.querySelector('.col-md-8');
    container.innerHTML = `
        <div class="booking-form mx-auto" style="max-width: 600px;">
            <div class="text-center mb-4">
                <h4>Book Room ${roomNumber}</h4>
                <p class="text-muted">${roomType} - $${price}/night</p>
            </div>
            <form id="bookingForm">
                <input type="hidden" name="room_id" value="${roomId}">
                <div class="row g-3">
                    <div class="col-md-6">
                        <input type="text" name="guest_name" class="form-control" placeholder="Full Name *" required>
                    </div>
                    <div class="col-md-6">
                        <input type="tel" name="guest_phone" class="form-control" placeholder="Phone">
                    </div>
                </div>
                <div class="mb-3 mt-3">
                    <input type="email" name="guest_email" class="form-control" placeholder="Email *" required>
                </div>
                <div class="row g-3">
                    <div class="col-md-6">
                        <input type="date" name="check_in" class="form-control" required min="${new Date().toISOString().split('T')[0]}">
                    </div>
                    <div class="col-md-6">
                        <input type="date" name="check_out" class="form-control" required min="${new Date().toISOString().split('T')[0]}">
                    </div>
                </div>
                <div class="mt-4 p-3 bg-light rounded">
                    <h5>Rate: <span class="text-primary">$${price}</span>/night 
                        <span id="total-price" class="float-end fs-4 fw-bold text-success">-</span>
                    </h5>
                </div>
                <div class="mt-4 d-grid gap-2">
                    <button type="submit" class="btn btn-success btn-lg">Confirm Booking</button>
                    <button type="button" class="btn btn-outline-secondary" onclick="loadRooms()">Cancel</button>
                </div>
            </form>
        </div>
    `;

    // Date calculations
    const checkinInput = document.querySelector('input[name="check_in"]');
    const checkoutInput = document.querySelector('input[name="check_out"]');
    
    function updateTotal() {
        const checkin = new Date(checkinInput.value);
        const checkout = new Date(checkoutInput.value);
        if (checkinInput.value && checkoutInput.value && checkout > checkin) {
            const days = (checkout - checkin) / (1000 * 60 * 60 * 24);
            document.getElementById('total-price').textContent = `$${ (days * price).toFixed(2) }`;
        }
    }
    
    checkinInput.addEventListener('change', updateTotal);
    checkoutInput.addEventListener('change', updateTotal);
    
    // Form submission
    document.getElementById('bookingForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        try {
            const response = await fetch('api.php?action=create_booking', {
                method: 'POST',
                body: formData
            });
            const result = await response.json();
            if (result.success) {
                alert(`Booking confirmed! Total: $${result.total.toFixed(2)}`);
                loadDashboard();
            }
        } catch(error) {
            alert('Booking failed. Please try again.');
        }
    });
}

async function loadBookings() {
    const response = await fetch('api.php?action=bookings');
    const bookings = await response.json();
    const container = document.getElementById('bookings-container');
    
    container.innerHTML = `
        <div class="table-responsive">
            <table class="table table-hover">
                <thead>
                    <tr>
                        <th>Room</th>
                        <th>Guest</th>
                        <th>Check-in</th>
                        <th>Check-out</th>
                        <th>Total</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${bookings.map(booking => `
                        <tr>
                            <td>${booking.room_number}</td>
                            <td>${booking.guest_name}</td>
                            <td>${new Date(booking.check_in).toLocaleDateString()}</td>
                            <td>${new Date(booking.check_out).toLocaleDateString()}</td>
                            <td>$${booking.total_amount}</td>
                            <td><span class="badge bg-success">${booking.status}</span></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}
