window.onload = () => {
    const loggedInUser = localStorage.getItem('loggedInUser');
  
    if (!loggedInUser) {
      window.location.href = '../authentication/adminLOGIN.html'; // Redirect if no user is logged in
    } else {
      const user = JSON.parse(loggedInUser);
      const adminName = user.username;  // Or use user.name if you stored the full user object
  
      // Display username in the welcome message
      const welcomeMessage = document.querySelector('.welcome');
      welcomeMessage.textContent = `WELCOME ${adminName}!`;  // Modify this as needed
    }
  };
  
  
   // Function to update date and time
   function updateDateTime() {
      const now = new Date();
      document.getElementById('datetime').textContent = now.toLocaleString();
    }
  
    // Update date and time every second
    setInterval(updateDateTime, 1000);
  
    // Initial call to show the time immediately when the page loads
    updateDateTime();
  
    // Toggle dropdown
    const userIcon = document.querySelector('.user-icon');
    const dropdown = document.querySelector('.dropdown');
  
    userIcon.addEventListener('click', () => {
      dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
    });
  
    // Close dropdown on outside click
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.user-menu')) {
        dropdown.style.display = 'none';
      }
    });
  
    // Logout functionality
    document.getElementById("logout-btn").addEventListener("click", () => {
      // Clear session or perform any other logout actions here
      window.location.href = "adminLOGIN.html"; // Redirect to login page
    });