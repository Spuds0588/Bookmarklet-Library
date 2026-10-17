/**
 * @name Generate password
 * @category text
 * @description Generate a strong password and copy it to the clipboard.
 * @tags password, security, generate
 * @added 2026-10-17
 * @featured false
 */
(function(){javascript:(async function() {
    // Function to generate the floating toast notification
    function showToast(message, isError) {
        const toast = document.createElement('div');
        toast.textContent = message;
        
        // Style the UI element directly via CSSOM to bypass most strict CSPs
        Object.assign(toast.style, {
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            backgroundColor: isError ? '#f44336' : '#4caf50',
            color: '#ffffff',
            padding: '12px 24px',
            borderRadius: '8px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontSize: '14px',
            fontWeight: '500',
            zIndex: '2147483647', // Maximum z-index
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            opacity: '0',
            transition: 'opacity 0.3s ease-in-out',
            pointerEvents: 'none'
        });
        
        document.body.appendChild(toast);
        
        // Trigger a DOM reflow so the fade-in transition works
        void toast.offsetWidth;
        toast.style.opacity = '1';

        // Fade out and remove after 3 seconds
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }

    try {
        // Safe character set avoiding confusing or heavily filtered characters
        const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*-_=+?";
        let password = "";
        
        // Cryptographically secure random generation
        const cryptoObj = window.crypto || window.msCrypto;
        if (cryptoObj && cryptoObj.getRandomValues) {
            const randomValues = new Uint32Array(30);
            cryptoObj.getRandomValues(randomValues);
            for (let i = 0; i < 30; i++) {
                password += chars[randomValues[i] % chars.length];
            }
        } else {
            // Fallback for extremely old browser contexts
            for (let i = 0; i < 30; i++) {
                password += chars.charAt(Math.floor(Math.random() * chars.length));
            }
        }

        let copied = false;
        
        // Method 1: Try modern Clipboard API
        if (navigator.clipboard && window.isSecureContext) {
            try {
                await navigator.clipboard.writeText(password);
                copied = true;
            } catch (e) {
                // Fail silently and proceed to Method 2
            }
        }
        
        // Method 2: Fallback to execCommand (for older sites or HTTP connections)
        if (!copied) {
            const textArea = document.createElement("textarea");
            textArea.value = password;
            textArea.style.position = "fixed";
            textArea.style.left = "-99999px";
            textArea.style.top = "-99999px";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            try {
                copied = document.execCommand('copy');
            } catch (err) {
                copied = false;
            }
            document.body.removeChild(textArea);
        }

        // Notify user of result
        if (copied) {
            showToast("Password generated & copied to clipboard!", false);
        } else {
            showToast("Copy failed: Browser blocked clipboard access.", true);
        }

    } catch(err) {
        showToast("Error: " + err.message, true);
    }
})();})();
