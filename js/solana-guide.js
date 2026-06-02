/**
 * Solana Starter Guide Logic
 * 🐕 CYNIC: Sniffing out providers...
 */

document.addEventListener('DOMContentLoaded', () => {
  const connectBtn = document.getElementById('connectWallet');
  const statusMsg = document.getElementById('walletStatus');

  if (connectBtn) {
    connectBtn.addEventListener('click', async () => {
      statusMsg.classList.remove('hidden');
      statusMsg.textContent = 'Searching for provider...';

      // Check for Phantom or other injected providers
      const isPhantomInstalled = window.solana && window.solana.isPhantom;

      if (isPhantomInstalled) {
        try {
          statusMsg.textContent = 'Requesting connection...';
          const resp = await window.solana.connect();
          const publicKey = resp.publicKey.toString();

          statusMsg.style.color = 'var(--asdf-green)';
          statusMsg.textContent = `Connected: ${publicKey.slice(0, 4)}...${publicKey.slice(-4)}`;
          connectBtn.textContent = 'Wallet Ready';
          connectBtn.disabled = true;

          console.log('*sniff* Connected to wallet:', publicKey);
        } catch (err) {
          statusMsg.style.color = 'var(--asdf-orange)';
          statusMsg.textContent = 'Connection refused by user.';
          console.error('Wallet connection error:', err);
        }
      } else {
        statusMsg.style.color = 'var(--asdf-orange)';
        statusMsg.innerHTML =
          'Provider not found. <a href="https://phantom.app" target="_blank" style="color: inherit; text-decoration: underline;">Install Phantom</a>';
      }
    });
  }
});
