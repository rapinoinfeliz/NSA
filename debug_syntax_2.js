                    const itemStyle="display:flex; flex-direction:column; justify-content:space-between; height:100%;";
                    const labelStyle="font-size:0.75rem; color:var(--text-secondary); margin-bottom:4px;";
                    const valStyle="font-size:1.1rem; font-weight:500; color:var(--text-primary); margin-top:auto;";

                    let html = '';

                    // Helper for info icon
                    const infoIcon = (title, text) => {
                        const tSafe = title.replace(/'/g, "\\'"); 
                        const txtSafe = text.replace(/'/g, "\\'");
                        return `<span onclick="window.showInfoTooltip(event, '${tSafe}', '${txtSafe}')" style="cursor:pointer; opacity:0.5; margin-left:4px; display:inline-flex; vertical-align:middle;"> <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg></span> `;
                    };

                    // --- Global Tab Handler (Restored) ---
                    window.openTab = function(tabName, btn) {
                        // Hide all
                        document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
                        // Show target
                        const target = document.getElementById('tab-' + tabName);
                        if(target) target.style.display = 'block';
                        
                        // Active State
                        document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
                        if(btn) btn.classList.add('active');

                        // Specific redraws
                        if(tabName === 'forecast16') window.renderAllForecasts();
                    };

                    // 1. Temperature Section (WBGT Integrated)
                    html += `<div style="${sectionStyle}">
