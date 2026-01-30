// ============== CONTENT.JS ==============
// Housing.com Element Analyzer - Fixed Popup Version

console.log('Housing.com Element Analyzer loaded');

// ============== MAIN ANALYZER CLASS ==============
class ElementAnalyzer {
    constructor() {
        this.locatorTable = null;
        this.isActive = false;
        window.lastMousePosition = { x: 0, y: 0 };
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
        this.initializeEventListeners();
        this.addGlobalStyles();
        console.log('ElementAnalyzer initialized');
    }

    initializeEventListeners() {
        // Track mouse position globally
        document.addEventListener('mousemove', (event) => {
            window.lastMousePosition = { 
                x: event.clientX, 
                y: event.clientY 
            };
        });

        // Listen for messages from popup or background script
        chrome.runtime?.onMessage?.addListener((request, sender, sendResponse) => {
            if (request.action === 'analyzePosition') {
                this.handleAnalyzeRequest(request);
                sendResponse({ success: true });
            }
        });

        // Add context menu for right-click analysis
        this.addContextMenu();
    }

    addGlobalStyles() {
        // Remove existing styles first to avoid duplicates
        const existingStyle = document.getElementById('element-analyzer-styles');
        if (existingStyle) existingStyle.remove();

        const style = document.createElement('style');
        style.id = 'element-analyzer-styles';
        style.textContent = `
            .element-analyzer-highlight {
                outline: 3px solid #ff0000 !important;
                outline-offset: 2px !important;
                position: relative !important;
                z-index: 9998 !important;
                transition: outline 0.2s ease !important;
            }
            
            .element-analyzer-highlight:hover {
                outline: 3px solid #ff9900 !important;
            }
            
            #element-locator-table {
                position: fixed !important;
                top: 20px;
                right: 20px;
                background: white !important;
                border: 3px solid #007bff !important;
                border-radius: 10px !important;
                padding: 20px !important;
                z-index: 2147483647 !important;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
                font-size: 14px !important;
                box-shadow: 0 6px 20px rgba(0,0,0,0.2) !important;
                min-width: 600px !important;
                max-width: 800px !important;
                max-height: 85vh !important;
                overflow-y: auto !important;
                display: block !important;
                opacity: 1 !important;
                visibility: visible !important;
                animation: slideIn 0.3s ease !important;
            }
            
            #element-locator-table.hidden {
                display: none !important;
                opacity: 0 !important;
                visibility: hidden !important;
            }
            
            @keyframes slideIn {
                from {
                    transform: translateX(100px) !important;
                    opacity: 0 !important;
                }
                to {
                    transform: translateX(0) !important;
                    opacity: 1 !important;
                }
            }
            
            .element-locator-title {
                font-weight: bold !important;
                font-size: 18px !important;
                margin-bottom: 15px !important;
                color: #007bff !important;
                border-bottom: 2px solid #007bff !important;
                padding-bottom: 8px !important;
                cursor: move !important;
                user-select: none !important;
            }
            
            .element-locator-info {
                margin: 8px 0 !important;
                line-height: 1.5 !important;
            }
            
            .element-locator-label {
                font-weight: bold !important;
                color: #333 !important;
                display: inline-block !important;
                min-width: 80px !important;
            }
            
            .element-locator-value {
                color: #666 !important;
                word-break: break-word !important;
            }
            
            .element-locator-buttons {
                margin-top: 15px !important;
                display: flex !important;
                gap: 10px !important;
                flex-wrap: wrap !important;
            }
            
            .element-locator-button {
                padding: 8px 16px !important;
                border: none !important;
                border-radius: 5px !important;
                cursor: pointer !important;
                font-weight: 600 !important;
                font-size: 14px !important;
                transition: all 0.2s !important;
                flex: 1 !important;
                min-width: 100px !important;
            }
            
            .element-locator-close {
                background: #dc3545 !important;
                color: white !important;
            }
            
            .element-locator-close:hover {
                background: #c82333 !important;
            }
            
            .element-locator-copy {
                background: #28a745 !important;
                color: white !important;
            }
            
            .element-locator-copy:hover {
                background: #218838 !important;
            }
            
            .element-locator-refresh {
                background: #17a2b8 !important;
                color: white !important;
            }
            
            .element-locator-refresh:hover {
                background: #138496 !important;
            }
        `;
        document.head.appendChild(style);
    }

    addContextMenu() {
        // Add custom context menu item
        document.addEventListener('contextmenu', (event) => {
            // Store click position for context menu
            window.contextMenuPosition = { x: event.clientX, y: event.clientY };
        }, true);
    }

    removeLocatorTable() {
        if (this.locatorTable && this.locatorTable.parentNode) {
            this.locatorTable.classList.add('hidden');
            setTimeout(() => {
                if (this.locatorTable && this.locatorTable.parentNode) {
                    this.locatorTable.parentNode.removeChild(this.locatorTable);
                }
                this.locatorTable = null;
            }, 300);
        }
    }

    async analyzeElementAtPosition(x, y) {
        console.log('analyzeElementAtPosition called with:', { x, y });
        
        // Handle different parameter formats
        if (x && typeof x === 'object') {
            if (x.clientX !== undefined && x.clientY !== undefined) {
                y = x.clientY;
                x = x.clientX;
            } else if (x.x !== undefined && x.y !== undefined) {
                y = x.y;
                x = x.x;
            } else if (Array.isArray(x) && x.length >= 2) {
                y = x[1];
                x = x[0];
            }
        }
        
        // Default to last known mouse position if coordinates are invalid
        if ((x === undefined || y === undefined) && window.lastMousePosition) {
            x = window.lastMousePosition.x;
            y = window.lastMousePosition.y;
            console.log('Using last mouse position:', { x, y });
        }
        
        // Validate coordinates
        if (typeof x !== 'number' || typeof y !== 'number' || isNaN(x) || isNaN(y)) {
            console.error('Invalid coordinates:', { x, y });
            this.showErrorPopup('Invalid coordinates provided');
            return null;
        }
        
        // Round coordinates
        x = Math.round(x);
        y = Math.round(y);
        
        if (!Number.isFinite(x) || !Number.isFinite(y)) {
            console.error('Non-finite coordinates:', { x, y });
            this.showErrorPopup('Invalid screen coordinates');
            return null;
        }
        
        try {
            this.removeLocatorTable();
            this.removeHighlights();
            
            // Get element at position
            const element = document.elementFromPoint(x, y);
            if (!element) {
                console.log('No element found at position:', { x, y });
                this.showNoElementPopup(x, y);
                return null;
            }
            
            console.log('Element found:', {
                tagName: element.tagName,
                className: element.className,
                id: element.id,
                x, y
            });
            
            // Highlight and show popup
            this.highlightElement(element);
            this.createLocatorTable(element, x, y);
            
            return element;
            
        } catch (error) {
            console.error('Error in analyzeElementAtPosition:', error);
            this.showErrorPopup(`Error: ${error.message}`);
            return null;
        }
    }

    removeHighlights() {
        const highlights = document.querySelectorAll('.element-analyzer-highlight');
        highlights.forEach(el => {
            el.style.outline = '';
            el.classList.remove('element-analyzer-highlight');
        });
    }

    highlightElement(element) {
        this.removeHighlights();
        
        element.style.outline = '3px solid #ff0000';
        element.style.outlineOffset = '2px';
        element.classList.add('element-analyzer-highlight');
        
        // Scroll element into view if needed
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    createLocatorTable(element, x, y) {
        try {
            this.removeLocatorTable();
            
            const table = document.createElement('div');
            table.id = 'element-locator-table';
            
            console.log('Creating locator table for element:', element);
            
            // Generate all Playwright locators
            const locators = this.generatePlaywrightLocators(element);
            
            console.log('Generated locators:', locators);
            
            // Create HTML content
            table.innerHTML = `
                <div class="element-locator-title">🎯 SemanticQA</div>
                <div style="font-size: 11px; color: #666; margin: -10px 0 15px 0; font-style: italic;">Playwright Locators Finder -Ganesh</div>
                
                <div class="element-locator-info" style="margin-bottom: 15px; padding: 10px; background: #e8f4f8; border-radius: 6px;">
                    <strong>${element.tagName.toLowerCase()}</strong>
                    ${element.id ? `<span style="color: #007acc;"> #${element.id}</span>` : ''}
                    ${element.className ? `<span style="color: #666; font-size: 12px;"> .${String(element.className).split(' ').join('.')}</span>` : ''}
                </div>
                
                ${this.createLocatorTableHTML(locators)}
                
                <div class="element-locator-buttons">
                    <button class="element-locator-button element-locator-close" id="closeLocatorBtn">Close</button>
                </div>
            `;
            
            document.body.appendChild(table);
            this.locatorTable = table;
            
            // Add drag functionality
            this.initializeDragFunctionality(table);
            
            // Add close button event listener
            const closeBtn = table.querySelector('#closeLocatorBtn');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    this.removeLocatorTable();
                });
            }
            
            // Add copy functionality to locator rows
            this.addCopyEventListeners(table);
            
            // Force display and focus
            table.style.display = 'block';
            table.style.visibility = 'visible';
            table.style.opacity = '1';
            
            console.log('Playwright locators popup displayed successfully');
        } catch (error) {
            console.error('Error creating locator table:', error);
            this.showErrorPopup(`Failed to create locator table: ${error.message}`);
        }
    }

    generatePlaywrightLocators(element) {
        const locators = [];
        
        // HIGH PRIORITY - Semantic Locators
        
        // 1. getByRole
        const role = element.getAttribute('role') || this.getImplicitRole(element);
        if (role) {
            const name = this.getAccessibleName(element);
            if (name) {
                const locator = `getByRole('${role}', { name: '${this.escapeString(name)}' })`;
                const count = this.countByRoleAndName(role, name);
                locators.push({
                    priority: 'high',
                    type: 'getByRole',
                    locator: locator,
                    count: count
                });
                
                console.log('Role:', role, 'Name:', name, 'Count:', count);
                
                // Add parent-child locator variant
                const parentContainer = this.findParentContainer(element);
                if (parentContainer) {
                    const parentLocator = this.generateParentLocator(parentContainer);
                    if (parentLocator) {
                        const parentChildLocator = `${parentLocator}.getByRole('${role}', { name: '${this.escapeString(name)}' })`;
                        locators.push({
                            priority: 'high',
                            type: 'parent > getByRole',
                            locator: parentChildLocator,
                            count: 1
                        });
                    }
                }
                
                // Always add filter variant to show context-based locator pattern
                const contextText = this.findContextText(element);
                console.log('Found context text:', contextText);
                if (contextText) {
                    const filteredLocator = `getByRole('${role}', { name: '${this.escapeString(name)}' }).filter({ has: page.getByText('${this.escapeString(contextText)}') })`;
                    console.log('Adding filtered locator:', filteredLocator);
                    locators.push({
                        priority: 'high',
                        type: 'getByRole + filter',
                        locator: filteredLocator,
                        count: 1
                    });
                }
            } else {
                const locator = `getByRole('${role}')`;
                const count = this.countByRole(role);
                locators.push({
                    priority: 'high',
                    type: 'getByRole',
                    locator: locator,
                    count: count
                });
                
                // Add parent-child locator variant
                const parentContainer = this.findParentContainer(element);
                if (parentContainer) {
                    const parentLocator = this.generateParentLocator(parentContainer);
                    if (parentLocator) {
                        const parentChildLocator = `${parentLocator}.getByRole('${role}')`;
                        locators.push({
                            priority: 'high',
                            type: 'parent > getByRole',
                            locator: parentChildLocator,
                            count: 1
                        });
                    }
                }
                
                // Always add filter variant to show context-based locator pattern
                const contextText = this.findContextText(element);
                if (contextText) {
                    const filteredLocator = `getByRole('${role}').filter({ has: page.getByText('${this.escapeString(contextText)}') })`;
                    locators.push({
                        priority: 'high',
                        type: 'getByRole + filter',
                        locator: filteredLocator,
                        count: 1
                    });
                }
            }
        }
        
        // 2. getByLabel
        const label = this.getAssociatedLabel(element);
        if (label) {
            const locator = `getByLabel('${this.escapeString(label)}')`;
            const count = this.countByLabel(label);
            locators.push({
                priority: 'high',
                type: 'getByLabel',
                locator: locator,
                count: count
            });
            
            // Add parent-child locator variant
            const parentContainer = this.findParentContainer(element);
            if (parentContainer) {
                const parentLocator = this.generateParentLocator(parentContainer);
                if (parentLocator) {
                    const parentChildLocator = `${parentLocator}.getByLabel('${this.escapeString(label)}')`;
                    locators.push({
                        priority: 'high',
                        type: 'parent > getByLabel',
                        locator: parentChildLocator,
                        count: 1
                    });
                }
            }
            
            // Always add filter variant to show context-based locator pattern
            const contextText = this.findContextText(element);
            if (contextText) {
                const filteredLocator = `getByLabel('${this.escapeString(label)}').filter({ has: page.getByText('${this.escapeString(contextText)}') })`;
                locators.push({
                    priority: 'high',
                    type: 'getByLabel + filter',
                    locator: filteredLocator,
                    count: 1
                });
            }
        }
        
        // 3. getByPlaceholder
        const placeholder = element.getAttribute('placeholder');
        if (placeholder) {
            const locator = `getByPlaceholder('${this.escapeString(placeholder)}')`;
            const count = document.querySelectorAll(`[placeholder="${this.escapeCSSValue(placeholder)}"]`).length;
            locators.push({
                priority: 'high',
                type: 'getByPlaceholder',
                locator: locator,
                count: count
            });
            
            // Add parent-child locator variant
            const parentContainer = this.findParentContainer(element);
            if (parentContainer) {
                const parentLocator = this.generateParentLocator(parentContainer);
                if (parentLocator) {
                    const parentChildLocator = `${parentLocator}.getByPlaceholder('${this.escapeString(placeholder)}')`;
                    locators.push({
                        priority: 'high',
                        type: 'parent > getByPlaceholder',
                        locator: parentChildLocator,
                        count: 1
                    });
                }
            }
            
            // Always add filter variant to show context-based locator pattern
            const contextText = this.findContextText(element);
            if (contextText) {
                const filteredLocator = `getByPlaceholder('${this.escapeString(placeholder)}').filter({ has: page.getByText('${this.escapeString(contextText)}') })`;
                locators.push({
                    priority: 'high',
                    type: 'getByPlaceholder + filter',
                    locator: filteredLocator,
                    count: 1
                });
            }
        }
        
        // 4. getByTestId
        const testId = element.getAttribute('data-testid') || element.getAttribute('data-test-id') || element.getAttribute('data-test');
        if (testId) {
            const locator = `getByTestId('${this.escapeString(testId)}')`;
            const count = document.querySelectorAll(`[data-testid="${this.escapeCSSValue(testId)}"], [data-test-id="${this.escapeCSSValue(testId)}"], [data-test="${this.escapeCSSValue(testId)}"]`).length;
            locators.push({
                priority: 'high',
                type: 'getByTestId',
                locator: locator,
                count: count
            });
            
            // Add parent-child locator variant
            const parentContainer = this.findParentContainer(element);
            if (parentContainer) {
                const parentLocator = this.generateParentLocator(parentContainer);
                if (parentLocator) {
                    const parentChildLocator = `${parentLocator}.getByTestId('${this.escapeString(testId)}')`;
                    locators.push({
                        priority: 'high',
                        type: 'parent > getByTestId',
                        locator: parentChildLocator,
                        count: 1
                    });
                }
            }
            
            // Always add filter variant to show context-based locator pattern
            const contextText = this.findContextText(element);
            if (contextText) {
                const filteredLocator = `getByTestId('${this.escapeString(testId)}').filter({ has: page.getByText('${this.escapeString(contextText)}') })`;
                locators.push({
                    priority: 'high',
                    type: 'getByTestId + filter',
                    locator: filteredLocator,
                    count: 1
                });
            }
        }
        
        // MEDIUM PRIORITY - Text-based Locators
        
        // 5. getByText (exact match)
        const text = element.textContent?.trim();
        if (text && text.length > 0 && text.length <= 100 && !this.hasMultipleTextNodes(element)) {
            const locator = `getByText('${this.escapeString(text)}')`;
            const count = this.countByText(text, element.tagName);
            locators.push({
                priority: 'medium',
                type: 'getByText',
                locator: locator,
                count: count
            });
            
            // Add filter if not unique
            if (count > 1) {
                const contextText = this.findContextText(element);
                if (contextText) {
                    const filteredLocator = `getByText('${this.escapeString(text)}').filter({ has: page.getByText('${this.escapeString(contextText)}') })`;
                    locators.push({
                        priority: 'medium',
                        type: 'getByText + filter',
                        locator: filteredLocator,
                        count: 1
                    });
                }
            }
        }
        
        // 6. getByAltText
        const alt = element.getAttribute('alt');
        if (alt) {
            const locator = `getByAltText('${this.escapeString(alt)}')`;
            const count = document.querySelectorAll(`[alt="${this.escapeCSSValue(alt)}"]`).length;
            locators.push({
                priority: 'medium',
                type: 'getByAltText',
                locator: locator,
                count: count
            });
            
            // Add filter if not unique
            if (count > 1) {
                const contextText = this.findContextText(element);
                if (contextText) {
                    const filteredLocator = `getByAltText('${this.escapeString(alt)}').filter({ has: page.getByText('${this.escapeString(contextText)}') })`;
                    locators.push({
                        priority: 'medium',
                        type: 'getByAltText + filter',
                        locator: filteredLocator,
                        count: 1
                    });
                }
            }
        }
        
        // 7. getByTitle
        const title = element.getAttribute('title');
        if (title) {
            const locator = `getByTitle('${this.escapeString(title)}')`;
            const count = document.querySelectorAll(`[title="${this.escapeCSSValue(title)}"]`).length;
            locators.push({
                priority: 'medium',
                type: 'getByTitle',
                locator: locator,
                count: count
            });
            
            // Add filter if not unique
            if (count > 1) {
                const contextText = this.findContextText(element);
                if (contextText) {
                    const filteredLocator = `getByTitle('${this.escapeString(title)}').filter({ has: page.getByText('${this.escapeString(contextText)}') })`;
                    locators.push({
                        priority: 'medium',
                        type: 'getByTitle + filter',
                        locator: filteredLocator,
                        count: 1
                    });
                }
            }
        }
        
        // LOW PRIORITY - CSS and XPath
        
        // 8. CSS by ID
        if (element.id) {
            const locator = `locator('#${element.id}')`;
            locators.push({
                priority: 'low',
                type: 'CSS (ID)',
                locator: locator,
                count: document.querySelectorAll(`#${CSS.escape(element.id)}`).length
            });
        }
        
        // 9. CSS by Class
        if (element.className && typeof element.className === 'string') {
            const classes = element.className.trim().split(/\s+/).join('.');
            if (classes) {
                const selector = `${element.tagName.toLowerCase()}.${classes}`;
                try {
                    const locator = `locator('${selector}')`;
                    locators.push({
                        priority: 'low',
                        type: 'CSS (Class)',
                        locator: locator,
                        count: document.querySelectorAll(selector).length
                    });
                } catch (e) {
                    // Invalid selector, skip
                }
            }
        }
        
        // 10. CSS Selector
        const cssSelector = this.generateCSSSelector(element);
        if (cssSelector) {
            try {
                const locator = `locator('${cssSelector}')`;
                locators.push({
                    priority: 'low',
                    type: 'CSS',
                    locator: locator,
                    count: document.querySelectorAll(cssSelector).length
                });
            } catch (e) {
                // Invalid selector, skip
            }
        }
        
        // 11. XPath
        const xpath = this.generateXPath(element);
        if (xpath) {
            try {
                const locator = `locator('${xpath}')`;
                locators.push({
                    priority: 'low',
                    type: 'XPath',
                    locator: locator,
                    count: document.evaluate(xpath, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null).snapshotLength
                });
            } catch (e) {
                // Invalid XPath, skip
            }
        }
        
        return locators;
    }

    createLocatorTableHTML(locators) {
        const priorities = {
            'high': { label: 'High Priority - Semantic Locators', color: '#2e7d32' },
            'medium': { label: 'Medium Priority - Text-based', color: '#ed6c02' },
            'low': { label: 'Low Priority - CSS/XPath', color: '#d32f2f' }
        };
        
        let html = '<div style="max-height: 400px; overflow-y: auto;">';
        
        ['high', 'medium', 'low'].forEach(priority => {
            const priorityLocators = locators.filter(l => l.priority === priority);
            if (priorityLocators.length > 0) {
                html += `
                    <div style="margin-bottom: 15px;">
                        <div style="background: ${priorities[priority].color}; color: white; padding: 6px 10px; font-weight: 600; font-size: 12px; border-radius: 4px; margin-bottom: 8px;">
                            ${priorities[priority].label}
                        </div>
                        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                            <thead>
                                <tr style="background: #f8f9fa; text-align: left;">
                                    <th style="padding: 8px; border: 1px solid #dee2e6; width: 25%;">Type</th>
                                    <th style="padding: 8px; border: 1px solid #dee2e6;">Locator</th>
                                    <th style="padding: 8px; border: 1px solid #dee2e6; width: 60px; text-align: center;">Count</th>
                                </tr>
                            </thead>
                            <tbody>
                `;
                
                priorityLocators.forEach(loc => {
                    const countColor = loc.count === 1 ? '#2e7d32' : loc.count > 1 ? '#ed6c02' : '#d32f2f';
                    const countTooltip = loc.count === 1 ? 'Unique locator' : loc.count > 1 ? 'Multiple matches' : 'No matches';
                    html += `
                        <tr class="locator-row" style="cursor: pointer; transition: background 0.2s;" data-locator="${this.escapeHTML(loc.locator)}" onmouseover="this.style.background='#f8f9fa'" onmouseout="this.style.background='white'">
                            <td style="padding: 8px; border: 1px solid #dee2e6; font-weight: 600; color: #495057;">${this.escapeHTML(loc.type)}</td>
                            <td style="padding: 8px; border: 1px solid #dee2e6; font-family: 'Courier New', monospace; font-size: 12px; word-break: break-all; color: #007acc;">
                                ${this.escapeHTML(loc.locator)}
                            </td>
                            <td style="padding: 8px; border: 1px solid #dee2e6; text-align: center; font-weight: 700; color: ${countColor};" title="${countTooltip}">
                                ${loc.count}
                            </td>
                        </tr>
                    `;
                });
                
                html += `
                            </tbody>
                        </table>
                    </div>
                `;
            }
        });
        
        html += '</div>';
        html += `
            <div style="margin-top: 10px; padding: 10px; background: #e3f2fd; border-radius: 6px; font-size: 12px; color: #1976d2;">
                💡 <strong>Tip:</strong> Click any locator row to copy it to clipboard. Count of 1 means unique locator!
            </div>
        `;
        
        return html;
    }

    addCopyEventListeners(table) {
        const rows = table.querySelectorAll('.locator-row');
        rows.forEach(row => {
            row.addEventListener('click', () => {
                const locator = row.getAttribute('data-locator');
                navigator.clipboard.writeText(locator).then(() => {
                    const originalBg = row.style.background;
                    row.style.background = '#d4edda';
                    setTimeout(() => {
                        row.style.background = originalBg;
                    }, 500);
                });
            });
        });
    }

    initializeDragFunctionality(table) {
        const titleElement = table.querySelector('.element-locator-title');
        if (!titleElement) return;
        
        titleElement.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            const rect = table.getBoundingClientRect();
            this.dragOffset = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
            titleElement.style.cursor = 'grabbing';
            e.preventDefault();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!this.isDragging || !this.locatorTable) return;
            
            const x = e.clientX - this.dragOffset.x;
            const y = e.clientY - this.dragOffset.y;
            
            // Keep popup within viewport bounds
            const maxX = window.innerWidth - this.locatorTable.offsetWidth;
            const maxY = window.innerHeight - this.locatorTable.offsetHeight;
            
            const boundedX = Math.max(0, Math.min(x, maxX));
            const boundedY = Math.max(0, Math.min(y, maxY));
            
            this.locatorTable.style.left = boundedX + 'px';
            this.locatorTable.style.top = boundedY + 'px';
            this.locatorTable.style.right = 'auto';
        });
        
        document.addEventListener('mouseup', () => {
            if (this.isDragging) {
                this.isDragging = false;
                if (titleElement) {
                    titleElement.style.cursor = 'move';
                }
            }
        });
    }
    
    // Helper methods for locator generation
    
    findParentContainer(element) {
        // Find the nearest meaningful parent container
        let current = element.parentElement;
        
        while (current && current !== document.body) {
            const tagName = current.tagName.toLowerCase();
            
            // Check for semantic containers
            if (['section', 'form', 'dialog', 'nav', 'aside', 'article', 'main', 'header', 'footer'].includes(tagName)) {
                return current;
            }
            
            // Check for elements with meaningful IDs
            if (current.id && current.id.length > 0) {
                // Exclude generic or dynamic IDs
                if (!current.id.match(/^(root|app|main|container|wrapper|\d+)$/i)) {
                    return current;
                }
            }
            
            // Check for dialog/modal classes
            if (current.className && typeof current.className === 'string') {
                if (current.className.match(/modal|dialog|popup|sidebar|panel|card/i)) {
                    return current;
                }
            }
            
            // Check for role attributes that indicate containers
            const role = current.getAttribute('role');
            if (role && ['dialog', 'form', 'navigation', 'region', 'complementary'].includes(role)) {
                return current;
            }
            
            current = current.parentElement;
        }
        
        return null;
    }
    
    generateParentLocator(parentElement) {
        // Generate a locator for the parent container
        if (!parentElement) return null;
        
        // Prefer ID
        if (parentElement.id) {
            return `locator('#${parentElement.id}')`;
        }
        
        // Try role with name
        const role = parentElement.getAttribute('role') || this.getImplicitRole(parentElement);
        if (role) {
            const name = this.getAccessibleName(parentElement);
            if (name) {
                return `getByRole('${role}', { name: '${this.escapeString(name)}' })`;
            }
        }
        
        // Try by test ID
        const testId = parentElement.getAttribute('data-testid') || parentElement.getAttribute('data-test-id');
        if (testId) {
            return `getByTestId('${this.escapeString(testId)}')`;
        }
        
        // Fallback to class-based selector
        if (parentElement.className && typeof parentElement.className === 'string') {
            const classes = parentElement.className.trim().split(/\s+/);
            const meaningfulClass = classes.find(c => 
                c.length > 2 && 
                c.match(/^[a-zA-Z]/) && 
                !c.match(/^(active|hidden|show|visible)$/i)
            );
            
            if (meaningfulClass) {
                return `locator('.${meaningfulClass}')`;
            }
        }
        
        // Fallback to tag name if semantic
        const tagName = parentElement.tagName.toLowerCase();
        if (['section', 'form', 'dialog', 'nav', 'aside', 'article'].includes(tagName)) {
            return `locator('${tagName}')`;
        }
        
        return null;
    }
    
    findContextText(element) {
        // Look for nearby heading or label that provides context
        let current = element;
        
        // Search up to 8 levels for context (increased from 5)
        for (let i = 0; i < 8; i++) {
            if (!current || !current.parentElement) break;
            current = current.parentElement;
            
            // Look for headings (h1-h6) in the parent
            const headings = current.querySelectorAll('h1, h2, h3, h4, h5, h6');
            for (let heading of headings) {
                // Skip if heading contains the clicked element
                if (heading.contains(element)) continue;
                
                const text = heading.textContent?.trim();
                console.log('Checking heading:', text);
                if (text && text.length > 0 && text.length < 300) {
                    // Accept any heading with reasonable text
                    if (text !== 'Yes' && text !== 'No') {
                        console.log('Found heading context:', text);
                        return text;
                    }
                }
            }
            
            // Look for labels with class containing 'lbl' or 'label' or 'question'
            const labelDivs = current.querySelectorAll('[class*="lbl"], [class*="label"], [class*="question"], [class*="field"], [class*="form"]');
            for (let div of labelDivs) {
                // Skip if this contains the clicked element
                if (div.contains(element)) continue;
                
                const text = div.textContent?.trim();
                console.log('Checking label div:', text);
                // Made less restrictive - removed word count requirement
                if (text && text.length > 5 && text.length < 300 && 
                    text !== 'Yes' && text !== 'No' && text !== 'Submit' && text !== 'Cancel') {
                    console.log('Found label div context:', text);
                    return text;
                }
            }
            
            // Look for any div/span/p that looks like a question or label
            const allDivs = current.querySelectorAll('div, span, p, legend, fieldset > *');
            for (let div of allDivs) {
                if (div.contains(element)) continue;
                if (div.children.length > 5) continue; // Skip large containers
                
                const text = div.textContent?.trim();
                // Accept questions or any text that looks like a label
                if (text && text.length > 10 && text.length < 300) {
                    // Filter out common non-descriptive text
                    const excludePatterns = ['Yes', 'No', 'Submit', 'Cancel', 'Close', 'Save', 'Delete'];
                    if (text.includes('?') || text.includes(':')) {
                        const isExcluded = excludePatterns.some(pattern => text.trim() === pattern);
                        if (!isExcluded) {
                            console.log('Found question/label context:', text);
                            return text;
                        }
                    }
                }
            }
            
            // Look for sibling elements that might contain context
            if (current.previousElementSibling) {
                const siblingText = current.previousElementSibling.textContent?.trim();
                if (siblingText && siblingText.length > 10 && siblingText.length < 300) {
                    const excludePatterns = ['Yes', 'No', 'Submit', 'Cancel', 'Close'];
                    const isExcluded = excludePatterns.some(pattern => siblingText.trim() === pattern);
                    if (!isExcluded && (siblingText.includes('?') || siblingText.includes(':'))) {
                        console.log('Found sibling context:', siblingText);
                        return siblingText;
                    }
                }
            }
        }
        
        console.log('No context found');
        return null;
    }
    
    countByRole(role) {
        let count = 0;
        const allElements = document.querySelectorAll('*');
        allElements.forEach(el => {
            const elementRole = el.getAttribute('role') || this.getImplicitRole(el);
            if (elementRole === role) count++;
        });
        return count;
    }

    countByRoleAndName(role, name) {
        let count = 0;
        const allElements = document.querySelectorAll('*');
        allElements.forEach(el => {
            const elementRole = el.getAttribute('role') || this.getImplicitRole(el);
            const elementName = this.getAccessibleName(el);
            if (elementRole === role && elementName === name) count++;
        });
        return count;
    }

    countByLabel(labelText) {
        let count = 0;
        // Count all form elements with this label
        const allInputs = document.querySelectorAll('input, select, textarea');
        allInputs.forEach(input => {
            const label = this.getAssociatedLabel(input);
            if (label === labelText) count++;
        });
        return count;
    }

    countByText(text, tagName) {
        let count = 0;
        const allElements = document.querySelectorAll('*');
        allElements.forEach(el => {
            const elText = el.textContent?.trim();
            // Match elements with exact text and no complex children
            if (elText === text && !this.hasMultipleTextNodes(el)) {
                count++;
            }
        });
        return count;
    }

    escapeCSSValue(value) {
        // Escape special characters for CSS attribute selectors
        return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    }
    
    getImplicitRole(element) {
        const tagName = element.tagName.toLowerCase();
        const roleMap = {
            'button': 'button',
            'a': 'link',
            'input': element.type === 'checkbox' ? 'checkbox' : element.type === 'radio' ? 'radio' : 'textbox',
            'textarea': 'textbox',
            'select': 'combobox',
            'h1': 'heading',
            'h2': 'heading',
            'h3': 'heading',
            'h4': 'heading',
            'h5': 'heading',
            'h6': 'heading',
            'img': 'img',
            'nav': 'navigation',
            'main': 'main',
            'header': 'banner',
            'footer': 'contentinfo',
            'section': 'region',
            'article': 'article',
            'aside': 'complementary',
            'form': 'form',
            'table': 'table',
            'ul': 'list',
            'ol': 'list',
            'li': 'listitem'
        };
        return roleMap[tagName] || null;
    }

    getAccessibleName(element) {
        // Check aria-label
        if (element.getAttribute('aria-label')) {
            return element.getAttribute('aria-label');
        }
        
        // Check aria-labelledby
        const labelledby = element.getAttribute('aria-labelledby');
        if (labelledby) {
            const labelElement = document.getElementById(labelledby);
            if (labelElement) return labelElement.textContent?.trim();
        }
        
        // Check associated label
        const label = this.getAssociatedLabel(element);
        if (label) return label;
        
        // Check value for inputs
        if (element.value && element.tagName.toLowerCase() === 'input') {
            return element.value;
        }
        
        // Check text content for buttons, links, etc.
        if (['button', 'a'].includes(element.tagName.toLowerCase())) {
            return element.textContent?.trim();
        }
        
        // Check alt for images
        if (element.tagName.toLowerCase() === 'img') {
            return element.getAttribute('alt');
        }
        
        return null;
    }

    getAssociatedLabel(element) {
        // Check if element has an ID and there's a label pointing to it
        if (element.id) {
            const label = document.querySelector(`label[for="${element.id}"]`);
            if (label) return label.textContent?.trim();
        }
        
        // Check if element is inside a label
        const parentLabel = element.closest('label');
        if (parentLabel) return parentLabel.textContent?.trim();
        
        return null;
    }

    hasMultipleTextNodes(element) {
        let textNodeCount = 0;
        for (let child of element.childNodes) {
            if (child.nodeType === Node.TEXT_NODE && child.textContent?.trim()) {
                textNodeCount++;
            }
        }
        return textNodeCount > 1 || element.children.length > 3;
    }

    generateCSSSelector(element) {
        if (element.id) return `#${element.id}`;
        
        const path = [];
        let current = element;
        
        while (current && current.nodeType === Node.ELEMENT_NODE && path.length < 4) {
            let selector = current.tagName.toLowerCase();
            
            // Add classes if available (filter out dynamic/highlight classes)
            if (current.className && typeof current.className === 'string') {
                const classes = current.className.trim().split(/\s+/)
                    .filter(c => c && !c.includes('highlight') && !c.includes('hover'))
                    .slice(0, 2)
                    .join('.');
                if (classes) selector += `.${classes}`;
            }
            
            path.unshift(selector);
            
            // Test if current path is unique
            try {
                const testSelector = path.join(' > ');
                const matches = document.querySelectorAll(testSelector);
                if (matches.length === 1) {
                    return testSelector;
                }
            } catch (e) {
                // Invalid selector, continue building
            }
            
            current = current.parentNode;
        }
        
        return path.join(' > ');
    }

    generateXPath(element) {
        if (element.id) return `//*[@id="${element.id}"]`;
        
        const parts = [];
        while (element && element.nodeType === Node.ELEMENT_NODE) {
            let index = 0;
            let sibling = element.previousSibling;
            
            while (sibling) {
                if (sibling.nodeType === Node.ELEMENT_NODE && sibling.tagName === element.tagName) {
                    index++;
                }
                sibling = sibling.previousSibling;
            }
            
            const tagName = element.tagName.toLowerCase();
            const pathIndex = index > 0 ? `[${index + 1}]` : '';
            parts.unshift(`${tagName}${pathIndex}`);
            
            if (parts.length > 4) break;
            element = element.parentNode;
        }
        
        return '//' + parts.join('/');
    }

    escapeString(str) {
        if (!str) return '';
        return str.replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '');
    }

    escapeHTML(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    getElementPath(element) {
        const path = [];
        while (element && element.nodeType === Node.ELEMENT_NODE) {
            let selector = element.nodeName.toLowerCase();
            if (element.id) {
                selector += `#${element.id}`;
                path.unshift(selector);
                break;
            } else {
                let sibling = element;
                let nth = 1;
                while (sibling.previousElementSibling) {
                    sibling = sibling.previousElementSibling;
                    if (sibling.nodeName.toLowerCase() === selector) nth++;
                }
                if (element.className) {
                    selector += `.${element.className.replace(/\s+/g, '.')}`;
                }
                selector += `:nth-child(${nth})`;
                path.unshift(selector);
                element = element.parentNode;
            }
        }
        return path.join(' > ');
    }

    getElementSelector(element) {
        if (element.id) return `#${element.id}`;
        
        const path = [];
        while (element && element.nodeType === Node.ELEMENT_NODE) {
            let selector = element.nodeName.toLowerCase();
            if (element.className) {
                selector += `.${element.className.replace(/\s+/g, '.')}`;
            }
            path.unshift(selector);
            if (path.length > 3) break;
            element = element.parentNode;
        }
        return path.join(' > ');
    }

    showNoElementPopup(x, y) {
        this.removeLocatorTable();
        
        const table = document.createElement('div');
        table.id = 'element-locator-table';
        table.style.background = '#fff3cd';
        table.style.borderColor = '#ffc107';
        
        table.innerHTML = `
            <div class="element-locator-title" style="color: #856404;">No Element Found</div>
            
            <div class="element-locator-info">
                <span class="element-locator-label">Coordinates:</span>
                <span class="element-locator-value">X: ${x}, Y: ${y}</span>
            </div>
            
            <div class="element-locator-info">
                <span class="element-locator-label">Viewport:</span>
                <span class="element-locator-value">${window.innerWidth} × ${window.innerHeight}px</span>
            </div>
            
            <div class="element-locator-info">
                <p style="color: #856404; margin: 10px 0;">
                    No DOM element was found at these coordinates. This might be:
                </p>
                <ul style="color: #856404; margin: 10px 0; padding-left: 20px;">
                    <li>An empty area of the page</li>
                    <li>Overlay content (like modals)</li>
                    <li>Outside the visible viewport</li>
                </ul>
            </div>
            
            <div class="element-locator-buttons">
                <button class="element-locator-button element-locator-refresh" onclick="window.elementAnalyzer.analyzeAtCursor()">Try Current Position</button>
                <button class="element-locator-button element-locator-close" onclick="window.elementAnalyzer.removeLocatorTable()">Close</button>
            </div>
        `;
        
        document.body.appendChild(table);
        this.locatorTable = table;
    }

    showErrorPopup(message) {
        this.removeLocatorTable();
        
        const table = document.createElement('div');
        table.id = 'element-locator-table';
        table.style.background = '#f8d7da';
        table.style.borderColor = '#dc3545';
        
        table.innerHTML = `
            <div class="element-locator-title" style="color: #721c24;">Error</div>
            
            <div class="element-locator-info">
                <span class="element-locator-label">Message:</span>
                <span class="element-locator-value" style="color: #721c24;">${message}</span>
            </div>
            
            <div class="element-locator-info">
                <p style="color: #721c24; margin: 10px 0;">
                    Please try:
                </p>
                <ul style="color: #721c24; margin: 10px 0; padding-left: 20px;">
                    <li>Refreshing the page</li>
                    <li>Clicking on a different element</li>
                    <li>Checking browser console for details</li>
                </ul>
            </div>
            
            <div class="element-locator-buttons">
                <button class="element-locator-button element-locator-refresh" onclick="location.reload()">Refresh Page</button>
                <button class="element-locator-button element-locator-close" onclick="window.elementAnalyzer.removeLocatorTable()">Close</button>
            </div>
        `;
        
        document.body.appendChild(table);
        this.locatorTable = table;
    }

    handleAnalyzeRequest(request) {
        console.log('Received analyze request:', request);
        
        if (request.coordinates) {
            this.analyzeElementAtPosition(request.coordinates.x, request.coordinates.y);
        } else if (request.position === 'cursor') {
            this.analyzeAtCursor();
        } else {
            this.analyzeElementAtPosition(window.innerWidth / 2, window.innerHeight / 2);
        }
    }

    // Public methods
    analyzeAtCursor() {
        return this.analyzeElementAtPosition(
            window.lastMousePosition.x,
            window.lastMousePosition.y
        );
    }

    toggleAnalyzer() {
        this.isActive = !this.isActive;
        if (this.isActive) {
            this.analyzeAtCursor();
        } else {
            this.removeLocatorTable();
            this.removeHighlights();
        }
        return this.isActive;
    }
}

// ============== GLOBAL SETUP ==============
// Create and expose global instance
window.elementAnalyzer = new ElementAnalyzer();

// Global helper functions
window.analyzeAtPosition = function(x, y) {
    return window.elementAnalyzer.analyzeElementAtPosition(x, y);
};

window.analyzeAtCursor = function() {
    return window.elementAnalyzer.analyzeAtCursor();
};

window.toggleAnalyzer = function() {
    return window.elementAnalyzer.toggleAnalyzer();
};

// Keyboard shortcuts
document.addEventListener('keydown', (event) => {
    // Ctrl+Shift+I (or Cmd+Shift+I on Mac) to analyze at cursor
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'I') {
        event.preventDefault();
        window.elementAnalyzer.analyzeAtCursor();
    }
    
    // Escape to close popup
    if (event.key === 'Escape') {
        window.elementAnalyzer.removeLocatorTable();
        window.elementAnalyzer.removeHighlights();
    }
    
    // Alt+A to toggle analyzer
    if (event.altKey && event.key === 'a') {
        event.preventDefault();
        window.elementAnalyzer.toggleAnalyzer();
    }
});

// Auto-initialize when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('DOM loaded - Element Analyzer ready');
    });
} else {
    console.log('DOM already loaded - Element Analyzer ready');
}

// Export for module systems if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ElementAnalyzer };
}

console.log('Housing.com Element Analyzer content.js loaded successfully');