/**
 * Unity WebGL Game Loader Module
 * Handles loading and initializing Unity games dynamically from a given URL
 */

class GameLoader {
  constructor() {
    this.currentGameUrl = null;
    this.currentGameContainer = null;
    this.unityInstance = null;
    this.isLoading = false;
    this.loadTimeout = null;
  }

  /**
   * Check browser WebGL support
   */
  static checkWebGLSupport() {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      return !!gl;
    } catch (e) {
      return false;
    }
  }

  /**
   * Load a Unity WebGL game into a container
   * @param {string} gameUrl - URL to the game's index.html or entry point
   * @param {string} containerId - ID of the container element (should have a canvas inside)
   * @param {Function} onProgress - Optional callback for loading progress (0-1)
   * @param {Function} onComplete - Optional callback when game is fully loaded
   * @param {Function} onError - Optional callback for errors
   */
  async loadGame(gameUrl, containerId, onProgress, onComplete, onError) {
    try {
      if (this.isLoading) {
        console.warn('Играта веќе се учитува');
        return;
      }

      // Check WebGL support
      if (!GameLoader.checkWebGLSupport()) {
        throw new Error('Вашиот прелистувач не ја поддржува WebGL. Користете модерен прелистувач како Chrome, Firefox, Safari или Edge.');
      }

      this.isLoading = true;
      this.currentGameUrl = gameUrl;
      this.currentGameContainer = document.getElementById(containerId);

      if (!this.currentGameContainer) {
        throw new Error(`Контејнер со ID "${containerId}" не постои`);
      }

      // Clear previous game content
      this.currentGameContainer.innerHTML = '';

      // Create canvas element
      const canvas = document.createElement('canvas');
      canvas.id = 'unity-canvas';
      
      // Use fixed game resolution (960x600 for 16:9 aspect ratio)
      // This matches the original Unity game build
      canvas.width = 960;
      canvas.height = 600;
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.display = 'block';
      canvas.style.backgroundColor = '#000';
      
      this.currentGameContainer.appendChild(canvas);

      // Set load timeout (30 seconds)
      this.loadTimeout = setTimeout(() => {
        this.isLoading = false;
        const error = new Error('Учитувањето на играта истече. Проверете ја вашата интернет врска и обидете се повторно.');
        if (onError) onError(error);
        this.showError(this.currentGameContainer, error.message);
      }, 30000);

      // Fetch the game's HTML to extract loader config
      const response = await fetch(gameUrl);
      if (!response.ok) {
        throw new Error(`Неможе да се преземе игра (HTTP ${response.status}). Проверете дека датотеките на играта постојат.`);
      }

      const htmlText = await response.text();
      console.log('Game HTML loaded, parsing configuration...');
      
      // Extract the loader script URL and config from the HTML - multiple patterns for flexibility
      let buildUrl = 'Build';
      let loaderScript = null;
      let dataUrl = null;
      let frameworkUrl = null;
      let codeUrl = null;
      
      // Try to extract buildUrl
      const buildUrlMatch = htmlText.match(/var\s+buildUrl\s*=\s*['"](.*?)['"]/);
      if (buildUrlMatch) {
        buildUrl = buildUrlMatch[1];
        console.log('Found buildUrl:', buildUrl);
      }
      
      // Try to extract loaderUrl
      const loaderUrlMatch = htmlText.match(/var\s+loaderUrl\s*=\s*['"](.*?)['"]/);
      if (loaderUrlMatch) {
        loaderScript = loaderUrlMatch[1];
        console.log('Found loaderUrl:', loaderScript);
      }
      
      // Try to extract paths from config object
      const dataMatch = htmlText.match(/dataUrl\s*:\s*['"](.*?)['"]/);
      if (dataMatch) {
        dataUrl = dataMatch[1];
        console.log('Found dataUrl:', dataUrl);
      }
      
      const frameworkMatch = htmlText.match(/frameworkUrl\s*:\s*['"](.*?)['"]/);
      if (frameworkMatch) {
        frameworkUrl = frameworkMatch[1];
        console.log('Found frameworkUrl:', frameworkUrl);
      }
      
      const codeMatch = htmlText.match(/codeUrl\s*:\s*['"](.*?)['"]/);
      if (codeMatch) {
        codeUrl = codeMatch[1];
        console.log('Found codeUrl:', codeUrl);
      }

      // Validate that we found the required paths
      if (!loaderScript || !dataUrl || !frameworkUrl || !codeUrl) {
        throw new Error('Could not extract game configuration from HTML. The game files may be incomplete or corrupted.');

      const baseUrl = gameUrl.substring(0, gameUrl.lastIndexOf('/'));
      
      // Resolve paths to absolute URLs
      const loaderScriptUrl = loaderScript.startsWith('http') 
        ? loaderScript 
        : baseUrl + '/' + loaderScript;

      const config = {
        dataUrl: dataUrl.startsWith('http') ? dataUrl : baseUrl + '/' + dataUrl,
        frameworkUrl: frameworkUrl.startsWith('http') ? frameworkUrl : baseUrl + '/' + frameworkUrl,
        codeUrl: codeUrl.startsWith('http') ? codeUrl : baseUrl + '/' + codeUrl,
        streamingAssetsUrl: baseUrl + '/StreamingAssets',
        companyName: 'Bushava',
        productName: 'Game',
        productVersion: '1.0',
        showBanner: (msg, type) => console.log(`[${type}] ${msg}`),
        devicePixelRatio: 1,
      };

      console.log('Game config resolved:', config);

      // Load and execute the loader script
      await this.loadScript(loaderScriptUrl);

      // Initialize Unity with the game
      this.initializeUnity(canvas, config, onProgress, onComplete, onError);

    } catch (error) {
      clearTimeout(this.loadTimeout);
      this.isLoading = false;
      console.error('Грешка при учитување на игра:', error);
      if (onError) onError(error);
      this.showError(this.currentGameContainer, error.message || 'Се случи непозната грешка при учитување на играта.');
    }
  }

  /**
   * Dynamically load a script with error handling
   */
  loadScript(scriptUrl) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = scriptUrl;
      script.async = true;
      
      script.onload = () => {
        console.log('✓ Скрипта за учитување вчитана:', scriptUrl);
        resolve();
      };
      
      script.onerror = () => {
        reject(new Error(`Неможе да се вчита скрипта за учитување: ${scriptUrl}. Датотеките на играта можат да недостасуваат.`));
      };
      
      script.onabort = () => {
        reject(new Error(`Учитувањето на скриптата беше прекинато: ${scriptUrl}`));
      };
      
      document.head.appendChild(script);
    });
  }

  /**
   * Initialize the Unity player using the global createUnityInstance function
   */
  initializeUnity(canvas, config, onProgress, onComplete, onError) {
    // Ensure createUnityInstance is available (loaded by the game's loader script)
    if (typeof createUnityInstance === 'undefined') {
      clearTimeout(this.loadTimeout);
      this.isLoading = false;
      const error = new Error('Иницијализацијата на Unity не беше успешна. Вашиот прелистувач можда не ја поддржува оваа игра.');
      if (onError) onError(error);
      this.showError(this.currentGameContainer, error.message);
      return;
    }

    createUnityInstance(canvas, config, (progress) => {
      if (onProgress) onProgress(progress);
    })
      .then((unityInstance) => {
        clearTimeout(this.loadTimeout);
        this.isLoading = false;
        this.unityInstance = unityInstance;
        if (onComplete) onComplete(unityInstance);
        console.log('✅ Играта успешно се вчита');
      })
      .catch((message) => {
        clearTimeout(this.loadTimeout);
        this.isLoading = false;
        console.error('Грешка при иницијализација на Unity:', message);
        const error = new Error(message || 'Се случи грешка при иницијализација на играта.');
        if (onError) onError(error);
        this.showError(this.currentGameContainer, message || 'Се случи грешка при иницијализација на играта.');
      });
  }

  /**
   * Unload and clean up the current game
   */
  unloadGame() {
    clearTimeout(this.loadTimeout);
    
    if (this.unityInstance) {
      try {
        this.unityInstance.Quit();
      } catch (e) {
        console.warn('Грешка при затворање на Unity примерок:', e);
      }
      this.unityInstance = null;
    }

    if (this.currentGameContainer) {
      this.currentGameContainer.innerHTML = '';
    }

    this.currentGameUrl = null;
    this.isLoading = false;
  }

  /**
   * Display error message in the container
   */
  showError(container, message) {
    if (container) {
      container.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; background-color: #1a1a1a; color: #fff; flex-direction: column; padding: 20px; text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">
          <div style="font-size: 3rem; margin-bottom: 15px;">⚠️</div>
          <div style="font-size: 1.3rem; font-weight: bold; margin-bottom: 10px; color: #ff6b6b;">Не можеше да се вчита играта</div>
          <div style="font-size: 0.95rem; color: #bbb; line-height: 1.5; max-width: 400px;">${this.escapeHtml(message)}</div>
          <div style="margin-top: 20px; font-size: 0.85rem; color: #888;">Обидете се да ја освежите страницата или контактирајте со поддршката.</div>
        </div>
      `;
    }
  }

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Get the current game URL
   */
  getCurrentGameUrl() {
    return this.currentGameUrl;
  }

  /**
   * Check if a game is currently loading
   */
  isGameLoading() {
    return this.isLoading;
  }
}

// Export as global for use in HTML
window.GameLoader = GameLoader;
