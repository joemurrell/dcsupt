(function () {
  const form = document.getElementById('admin-login-form');
  const message = document.getElementById('login-message');

  if (!form) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    message.textContent = 'Authenticating...';

    const body = {
      username: form.username.value.trim(),
      password: form.password.value
    };

    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      message.textContent = data.error || 'Login failed.';
      return;
    }

    message.textContent = 'Login successful. Redirecting...';
    window.location.href = '/admin/index.html';
  });
})();
