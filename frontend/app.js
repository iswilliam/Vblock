document.addEventListener('DOMContentLoaded', function() {
    showPage('signin');
    const walletBtn = document.getElementById('walletBtn');
    if (walletBtn) {
        walletBtn.addEventListener('click', connectWallet);
    }
});

async function connectWallet() {
    const walletStatus = document.getElementById('walletStatus');
    const walletBtn = document.getElementById('walletBtn');
    const signInForm = document.getElementById('signInForm');
    if (typeof window.ethereum !== 'undefined') {
        try {
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            window.userWalletAddress = accounts[0];
            walletStatus.className = 'wallet-status wallet-connected';
            walletStatus.innerHTML = `<span>MetaMask: Connected (${accounts[0].substring(0, 6)}...${accounts[0].substring(38)})</span>`;
            walletBtn.textContent = 'Connected';
            walletBtn.disabled = true;
            // Show sign-in form
            signInForm.classList.remove('hidden');
        } catch (error) {
            walletStatus.className = 'wallet-status wallet-disconnected';
            walletStatus.innerHTML = `<span>MetaMask: Connection Failed</span>`;
        }
    } else {
        walletStatus.className = 'wallet-status wallet-disconnected';
        walletStatus.innerHTML = `<span>MetaMask: Not Installed</span>`;
    }
}

// Example login function
window.login = function(event) {
    event.preventDefault();
    // Your login logic here
    // If successful:
    showPage('dashboard');
};

// Show page utility
function showPage(pageId) {
    const pages = ['homePage', 'aboutPage', 'contactPage', 'signinPage', 'dashboardPage'];
    pages.forEach(page => {
        document.getElementById(page).classList.add('hidden');
    });
    document.getElementById(pageId + 'Page').classList.remove('hidden');
}