(function() {
    'use strict';

    // Constants
    const API_URL = 'https://soulapicrash.pythonanywhere.com';
    const STORAGE_KEYS = {
        DEVICE_ID: 'deviceId',
        LAST_USED_KEY: 'lastUsedKey'
    };

    // Helper functions
    const $ = (selector) => document.querySelector(selector);
    const $$ = (selector) => document.querySelectorAll(selector);
    const createElement = (tag, attributes = {}, children = []) => {
        const element = document.createElement(tag);
        Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
        children.forEach(child => element.appendChild(child));
        return element;
    };

    // Styles
    const styles = `
        .predictor-container {
            position: fixed;
            top: 24px;
            left: 24px;
            width: 310px;
            padding: 20px;
            background-color: rgba(13, 17, 23, 0.95);
            color: #e6edf3;
            border: 1px solid rgba(48, 54, 61, 0.6);
            border-radius: 12px;
            z-index: 10000;
            box-shadow: 0 4px 30px rgba(0, 0, 0, 0.5);
        }
        .glow-text {
            text-align: center;
            font-family: 'Inter', sans-serif;
            color: #fff;
            font-weight: 700;
            letter-spacing: 1.5px;
            font-size: 18px;
            margin-bottom: 21px;
            text-shadow: 0 0 10px rgba(88, 166, 255, 0.7);
        }
        .login-input {
            width: 100%;
            padding: 12px 16px;
            margin-bottom: 16px;
            background: rgba(48, 54, 61, 0.8);
            border: 1px solid rgba(48, 54, 61, 0.6);
            color: #e6edf3;
            border-radius: 8px;
            font-size: 14px;
        }
        .login-button, .control-button {
            width: 100%;
            font-family: 'Inter', sans-serif;
            padding: 12px;
            background: linear-gradient(45deg, #6a11cb, #2575fc);
            text-shadow: 0 0 10px rgba(88, 166, 255, 0.7);
            color: #fff;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 17px;
            margin-bottom: 10px;
        }
        .glow-button {
            text-shadow: 0 0 10px rgba(88, 166, 255, 0.7), 0 0 20px rgba(88, 166, 255, 0.5);
        }
        .message {
            padding: 12px;
            border-radius: 8px;
            margin-top: 12px;
            text-align: center;
            font-size: 14px;
        }
        .error-message {
            background-color: rgba(248, 81, 73, 0.15);
            color: #f85149;
        }
        .success-message {
            background-color: rgba(46, 160, 67, 0.15);
            color: #3fb950;
        }
        #mines-table-container {
            position: fixed;
            top: 10px;
            right: 10px;
            background-color: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 10px;
            border: 2px solid #00FF00;
            border-radius: 8px;
            z-index: 9999;
            font-family: 'Inter', sans-serif;
            font-size: 15px;
            width: 300px;
            max-height: 400px;
            overflow-y: auto;
        }
        #mines-table {
            width: 100%;
            border-collapse: collapse;
        }
        #mines-table th, #mines-table td {
            border: 1px solid #444;
            padding: 5px;
            text-align: center;
        }
        #stats-container {
            cursor: move;
            display: none;
            position: absolute;
            z-index: 9999;
        }
        @media (min-width: 768px) {
            #stats-container {
                display: block;
            }
        }
        @media (max-width: 768px) {
            #stats-container {
                display: none;
            }
        }
    `;

    // Utility functions
    const generateDeviceId = () => {
        let deviceId = localStorage.getItem(STORAGE_KEYS.DEVICE_ID);
        if (!deviceId) {
            deviceId = 'dev_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem(STORAGE_KEYS.DEVICE_ID, deviceId);
        }
        return deviceId;
    };

    class EnhancedMinesPredictor {
        constructor() {
            this.isActive = false;
            this.tileHistory = new Map();
            this.numberOfClicks = 8;
            this.maxRetries = 5;
            this.retryDelay = 2000;
            this.clickDelay = 1000;
            this.initUI();
        }

        initUI() {
            const styleElement = createElement('style', {}, [document.createTextNode(styles)]);
            document.head.appendChild(styleElement);

            const container = createElement('div', { class: 'predictor-container', id: 'draggable-container' }, [
                createElement('h2', { class: 'glow-text' }, [document.createTextNode('Soul Predictor - Froza')]),
                createElement('input', { type: 'password', id: 'activation-key', placeholder: 'Enter Login Key', class: 'login-input' }),
                createElement('button', { id: 'login-button', class: 'login-button' }, [document.createTextNode('Login')]),
                createElement('div', { id: 'login-message' })
            ]);

            document.body.appendChild(container);
            $('#login-button').addEventListener('click', () => this.login());

            const lastUsedKey = localStorage.getItem(STORAGE_KEYS.LAST_USED_KEY);
            if (lastUsedKey) {
                $('#activation-key').value = lastUsedKey;
            }

            this.makeDraggable(container);
        }

        makeDraggable(element) {
            let isMouseDown = false;
            let offset = [0, 0];

            element.addEventListener('mousedown', (e) => {
                isMouseDown = true;
                offset = [
                    element.offsetLeft - e.clientX,
                    element.offsetTop - e.clientY
                ];
                element.style.cursor = 'move';
            });

            document.addEventListener('mouseup', () => {
                isMouseDown = false;
                element.style.cursor = 'default';
            });

            document.addEventListener('mousemove', (e) => {
                e.preventDefault();
                if (isMouseDown) {
                    element.style.left = (e.clientX + offset[0]) + 'px';
                    element.style.top = (e.clientY + offset[1]) + 'px';
                }
            });
        }

        async login() {
            const activationKey = $('#activation-key').value;
            const deviceId = generateDeviceId();
            const loginMessageDiv = $('#login-message');

            try {
                const response = await fetch(`${API_URL}/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-User-Identifier': deviceId
                    },
                    body: JSON.stringify({ activation_key: activationKey }),
                });

                const data = await response.json();

                if (response.ok && data.status === 'success') {
                    localStorage.setItem(STORAGE_KEYS.LAST_USED_KEY, activationKey);
                    this.showSuccessMessage('Login successful!');
                    this.initializePredictor();
                } else {
                    throw new Error(data.error || 'Login failed. Please check your activation key.');
                }
            } catch (error) {
                this.showErrorMessage(error.message || 'Connection error. Please try again.');
            }
        }

        showErrorMessage(message) {
            const messageDiv = $('#login-message');
            messageDiv.className = 'message error-message';
            messageDiv.textContent = message;
        }

        showSuccessMessage(message) {
            const messageDiv = $('#login-message');
            messageDiv.className = 'message success-message';
            messageDiv.textContent = message;
        }

        initializePredictor() {
            $('.predictor-container').innerHTML = `
                <h2 class="glow-text">Soul Predictor - Froza</h2>
                <div class="controls-container">
                    <select id="number-of-clicks" class="login-input">
                        ${[...Array(14).keys()].slice(1).map(i => `<option value="${i}">${i} Clicks</option>`).join('')}
                    </select>
                    <select id="mines-count" class="login-input">
                        ${[...Array(11).keys()].slice(1).map(i => `<option value="${i}">${i} Mines</option>`).join('')}
                    </select>
                    <button id="start-button" class="control-button glow-button">START</button>
                </div>
                <div id="stats-container" class="stats-container">
                    <!-- Stats content will be dynamically generated -->
                </div>
            `;

            $('#start-button').addEventListener('click', () => this.togglePrediction());
            this.createHistoryTable();

            this.makeDraggable($('#stats-container'));
        }

        togglePrediction() {
            const startButton = $('#start-button');
            if (this.isActive) {
                this.stopPrediction();
                startButton.textContent = 'START';
            } else {
                this.startPrediction();
                startButton.textContent = 'STOP';
            }
        }

        startPrediction() {
            this.isActive = true;
            this.numberOfClicks = parseInt($('#number-of-clicks').value, 10) || 8;
            const minesCount = $('#mines-count').value;

            if (minesCount) {
                this.setGameValues(minesCount);
                this.startGameLoop();
            }
        }

        stopPrediction() {
            this.isActive = false;
        }

        setGameValues(minesCount) {
            const minesInput = $("[data-test=\"mines-count\"]");
            if (minesInput) {
                minesInput.value = minesCount;
                minesInput.dispatchEvent(new Event("change", { bubbles: true }));
            }
        }

        async startGameLoop() {
            if (!this.isActive) return;

            try {
                await this.startNewRound();
            } catch (error) {
                console.error('Error in game loop:', error);
                if (this.isActive) {
                    setTimeout(() => this.startGameLoop(), this.retryDelay);
                }
            }
        }

        async startNewRound() {
            if (!this.isActive) return;

            try {
                // Wait for bet button with increased timeout
                const betButton = await this.waitForElement("[data-testid=\"bet-button\"]", 15000);

                // Ensure button is clickable
                if (betButton && !betButton.disabled) {
                    betButton.click();
                    await this.delay(1500); // Increased delay for stability

                    if (this.isActive) {
                        const tiles = Array.from($$("[data-test=\"mines-tile\"]"));
                        if (tiles.length > 0) {
                            await this.handleTiles(tiles);
                        } else {
                            // If tiles not found, retry
                            await this.delay(2000);
                            this.startGameLoop();
                        }
                    }
                } else {
                    // If button not clickable, retry
                    await this.delay(2000);
                    this.startGameLoop();
                }
            } catch (error) {
                console.error('Error in startNewRound:', error);
                if (this.isActive) {
                    await this.delay(3000);
                    this.startGameLoop();
                }
            }
        }

        async handleTiles(tiles) {
            if (!this.isActive) return;

            try {
                this.initializeTileHistory(tiles);
                let clickCount = 0;

                while (this.isActive && clickCount < this.numberOfClicks) {
                    const selectedTile = await this.selectAndClickTile(tiles);
                    if (!selectedTile) {
                        // If tile selection fails, retry the round
                        await this.delay(2000);
                        this.startGameLoop();
                        return;
                    }

                    clickCount++;
                    await this.delay(this.clickDelay);

                    const tileClass = selectedTile.className;
                    this.updateTileHistory(selectedTile, tileClass);

                    if (tileClass.includes("mine")) {
                        await this.delay(2000);
                        if (this.isActive) {
                            this.startGameLoop();
                        }
                        return;
                    }
                }

                await this.cashout();
            } catch (error) {
                console.error('Error in handleTiles:', error);
                if (this.isActive) {
                    await this.delay(3000);
                    this.startGameLoop();
                }
            }
        }

        async selectAndClickTile(tiles) {
            const weightedTiles = this.calculateWeightedTiles();
            const selectedIndex = this.selectTileIndex(weightedTiles);

            if (selectedIndex === null || !tiles[selectedIndex]) {
                return null;
            }

            const selectedTile = tiles[selectedIndex];
            selectedTile.click();
            return selectedTile;
        }

        calculateWeightedTiles() {
            const weightedTiles = [];
            this.tileHistory.forEach((data, index) => {
                const { bombs, clicks } = data;
                weightedTiles.push({
                    index: index,
                    weight: this.calculateWeight(bombs, clicks)
                });
            });

            const totalWeight = weightedTiles.reduce((sum, tile) => sum + tile.weight, 0);
            return weightedTiles.map(tile => ({
                ...tile,
                normalizedWeight: tile.weight / totalWeight
            }));
        }

        selectTileIndex(weightedTiles) {
            const random = Math.random();
            let accumulator = 0;

            for (const { index, normalizedWeight } of weightedTiles) {
                accumulator += normalizedWeight;
                if (random <= accumulator) {
                    return index;
                }
            }

            return null;
        }

        updateTileHistory(tile, tileClass) {
            const index = Array.from($$("[data-test=\"mines-tile\"]")).indexOf(tile);
            if (this.tileHistory.has(index)) {
                const data = this.tileHistory.get(index);
                data.clicks++;
                if (tileClass.includes("mine")) {
                    data.bombs++;
                }
                this.updateHistoryTable();
            }
        }

        async cashout() {
            for (let i = 0; i < this.maxRetries; i++) {
                const cashoutButton = $("[data-testid=\"cashout-button\"]");
                if (cashoutButton) {
                    cashoutButton.click();
                    // Add delay before starting next round
                    await this.delay(2000);
                    if (this.isActive) {
                        this.startGameLoop();
                    }
                    return;
                }
                await this.delay(this.retryDelay);
            }
            console.error('Failed to cashout after max retries');
            // Even if cashout fails, try to continue
            if (this.isActive) {
                await this.delay(3000);
                this.startGameLoop();
            }
        }

        initializeTileHistory(tiles) {
            tiles.forEach((tile, index) => {
                if (!this.tileHistory.has(index)) {
                    this.tileHistory.set(index, {
                        bombs: 0,
                        clicks: 0
                    });
                }
            });
        }

        calculateWeight(bombs, clicks) {
            if (clicks === 0) return 1;
            return 1 / (1 + bombs + clicks);
        }

        createHistoryTable() {
            const container = createElement('div', { id: 'mines-table-container' });
            const table = createElement('table', { id: 'mines-table' });

            const headerRow = createElement('tr');
            ["Tile", "Mines", "Clicks", "Points"].forEach(text => {
                headerRow.appendChild(createElement('th', {}, [document.createTextNode(text)]));
            });

            table.appendChild(headerRow);
            container.appendChild(table);
            document.body.appendChild(container);

            this.makeDraggable(container);
        }

        updateHistoryTable() {
            const table = $('#mines-table');
            if (!table) return;

            table.innerHTML = '';

            const headerRow = createElement('tr');
            ["Tile", "Mines", "Clicks", "Points"].forEach(text => {
                const header = createElement('th', {}, [document.createTextNode(text)]);
                header.style.border = "5px solid #00FF00";
                header.style.padding = "5px";
                header.style.textAlign = "center";
                headerRow.appendChild(header);
            });
            table.appendChild(headerRow);

            this.tileHistory.forEach((data, index) => {
                const row = createElement('tr', {
                    style: `background-color: ${data.bombs > 0 ? '#FF0000' : '#008000'};`
                });

                [
                    index + 1,
                    data.bombs,
                    data.clicks,
                    this.calculateWeight(data.bombs, data.clicks).toFixed(2)
                ].forEach(text => {
                    const cell = createElement('td', {}, [document.createTextNode(text)]);
                    cell.style.padding = "5px";
                    cell.style.textAlign = "center";
                    row.appendChild(cell);
                });

                table.appendChild(row);
            });
        }

        async waitForElement(selector, timeout = 10000) {
            const startTime = Date.now();
            while (Date.now() - startTime < timeout) {
                const element = $(selector);
                if (element) return element;
                await this.delay(100);
            }
            throw new Error(`Element ${selector} not found within ${timeout}ms`);
        }

        delay(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }
    }

    // Initialize the script when the page loads
    window.addEventListener("load", () => {
        new EnhancedMinesPredictor();
    });
})();
