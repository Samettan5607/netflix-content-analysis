// State Management
const state = {
    titles: [],
    countryData: [],
    yearlyData: [],
    filteredTitles: [],
    explorer: {
        currentPage: 1,
        pageSize: 15,
        searchQuery: '',
        type: 'all',
        country: 'all',
        rating: 'all',
        year: 'all'
    },
    charts: {
        pie: null,
        country: null,
        growth: null
    }
};

// Initialize Lucide Icons
document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    initApp();
});

// App Initialization
async function initApp() {
    setupTabNavigation();
    setupEventListeners();
    await loadDashboardData();
}

// Tab Navigation Logic
function setupTabNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.tab-section');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const tabId = item.getAttribute('data-tab');

            // Update active nav class
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            // Update active section class
            sections.forEach(section => {
                section.classList.remove('active');
                if (section.getAttribute('id') === `tab-${tabId}`) {
                    section.classList.add('active');
                }
            });

            // Redraw charts if needed (fixes canvas sizing bugs inside hidden tabs)
            if (tabId === 'country-analysis' && state.charts.country) {
                state.charts.country.resize();
            }
            if (tabId === 'growth-trends' && state.charts.growth) {
                state.charts.growth.resize();
            }
        });
    });
}

// Listeners Setup
function setupEventListeners() {
    // Run Analysis Button
    const runBtn = document.getElementById('run-analysis-btn');
    if (runBtn) {
        runBtn.addEventListener('click', handleRunAnalysis);
    }

    // Country Chart Filters
    const countryFilters = document.querySelectorAll('#country-chart-filters button');
    countryFilters.forEach(btn => {
        btn.addEventListener('click', (e) => {
            countryFilters.forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            const type = e.currentTarget.getAttribute('data-type');
            updateCountryChartFilter(type);
        });
    });

    // Explorer Filters
    const searchInput = document.getElementById('search-input');
    const filterType = document.getElementById('filter-type');
    const filterCountry = document.getElementById('filter-country');
    const filterRating = document.getElementById('filter-rating');
    const filterYear = document.getElementById('filter-year');
    const clearFiltersBtn = document.getElementById('clear-filters-btn');

    if (searchInput) searchInput.addEventListener('input', (e) => {
        state.explorer.searchQuery = e.target.value;
        state.explorer.currentPage = 1;
        applyExplorerFilters();
    });

    if (filterType) filterType.addEventListener('change', (e) => {
        state.explorer.type = e.target.value;
        state.explorer.currentPage = 1;
        applyExplorerFilters();
    });

    if (filterCountry) filterCountry.addEventListener('change', (e) => {
        state.explorer.country = e.target.value;
        state.explorer.currentPage = 1;
        applyExplorerFilters();
    });

    if (filterRating) filterRating.addEventListener('change', (e) => {
        state.explorer.rating = e.target.value;
        state.explorer.currentPage = 1;
        applyExplorerFilters();
    });

    if (filterYear) filterYear.addEventListener('change', (e) => {
        state.explorer.year = e.target.value;
        state.explorer.currentPage = 1;
        applyExplorerFilters();
    });

    if (clearFiltersBtn) clearFiltersBtn.addEventListener('click', () => {
        if (searchInput) searchInput.value = '';
        if (filterType) filterType.value = 'all';
        if (filterCountry) filterCountry.value = 'all';
        if (filterRating) filterRating.value = 'all';
        if (filterYear) filterYear.value = 'all';

        state.explorer = {
            currentPage: 1,
            pageSize: 15,
            searchQuery: '',
            type: 'all',
            country: 'all',
            rating: 'all',
            year: 'all'
        };
        applyExplorerFilters();
        showToast('Filtreler temizlendi.');
    });

    // Pagination Buttons
    const prevBtn = document.getElementById('prev-page-btn');
    const nextBtn = document.getElementById('next-page-btn');

    if (prevBtn) prevBtn.addEventListener('click', () => {
        if (state.explorer.currentPage > 1) {
            state.explorer.currentPage--;
            renderExplorerTable();
        }
    });

    if (nextBtn) nextBtn.addEventListener('click', () => {
        const totalPages = Math.ceil(state.filteredTitles.length / state.explorer.pageSize);
        if (state.explorer.currentPage < totalPages) {
            state.explorer.currentPage++;
            renderExplorerTable();
        }
    });
}

// Fetch and Parse Data
async function loadDashboardData() {
    showLoader(true);
    try {
        // Fetch raw titles data
        const titlesResponse = await fetch('data/netflix_titles.csv');
        if (!titlesResponse.ok) throw new Error(`CSV yüklenemedi (${titlesResponse.status})`);
        const titlesText = await titlesResponse.text();
        const parsedTitles = Papa.parse(titlesText, { header: true, skipEmptyLines: true });
        state.titles = parsedTitles.data;
        state.filteredTitles = [...state.titles];

        // Fetch country aggregated data
        const countryResponse = await fetch('output/country_content_analysis.csv');
        if (!countryResponse.ok) throw new Error(`CSV yüklenemedi (${countryResponse.status})`);
        const countryText = await countryResponse.text();
        const parsedCountry = Papa.parse(countryText, { header: true, skipEmptyLines: true });
        state.countryData = parsedCountry.data;

        // Fetch yearly growth data
        const yearlyResponse = await fetch('output/yearly_growth.csv');
        if (!yearlyResponse.ok) throw new Error(`CSV yüklenemedi (${yearlyResponse.status})`);
        const yearlyText = await yearlyResponse.text();
        const parsedYearly = Papa.parse(yearlyText, { header: true, skipEmptyLines: true });
        state.yearlyData = parsedYearly.data;

        // Populate metrics and render components
        computeOverviewKPIs();
        renderOverviewCharts();
        renderCountrySection();
        renderGrowthSection();
        initExplorerFilters();
        applyExplorerFilters();

        showLoader(false);
    } catch (error) {
        console.error('Data loading failed:', error);
        showToast('Veriler yüklenirken hata oluştu!', 'error');
        showLoader(false);
    }
}

// Helper: Show/Hide Loader
function showLoader(show) {
    const loader = document.getElementById('loading-screen');
    const activeSection = document.querySelector('.tab-section.active');

    if (loader) {
        if (show) {
            loader.classList.remove('hidden');
            if (activeSection) activeSection.style.opacity = '0.3';
        } else {
            loader.classList.add('hidden');
            if (activeSection) activeSection.style.opacity = '1';
        }
    }
}

// Toast Notifications
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toast-message');

    if (toast && toastMsg) {
        toastMsg.textContent = message;

        // Reset classes
        toast.className = 'toast';
        if (type === 'error') {
            toast.style.borderColor = '#ff4d4d';
        } else {
            toast.style.borderColor = 'var(--netflix-red)';
        }

        toast.classList.remove('hidden');

        setTimeout(() => {
            toast.classList.add('hidden');
        }, 3000);
    }
}

// KPI Calculation
function computeOverviewKPIs() {
    const totalCount = state.titles.length;
    const movies = state.titles.filter(t => t.type === 'Movie');
    const shows = state.titles.filter(t => t.type === 'TV Show');

    const movieCount = movies.length;
    const showCount = shows.length;
    const moviePct = ((movieCount / totalCount) * 100).toFixed(1);
    const showPct = ((showCount / totalCount) * 100).toFixed(1);

    // Peak Year
    const yearCounts = {};
    let peakYear = '-';
    let peakCount = 0;

    state.titles.forEach(item => {
        const yr = item.release_year;
        if (yr) {
            yearCounts[yr] = (yearCounts[yr] || 0) + 1;
            if (yearCounts[yr] > peakCount) {
                peakCount = yearCounts[yr];
                peakYear = yr;
            }
        }
    });

    // Update UI elements
    document.getElementById('kpi-total').textContent = totalCount.toLocaleString();
    document.getElementById('kpi-movies').textContent = movieCount.toLocaleString();
    document.getElementById('kpi-movies-pct').textContent = `%${moviePct}`;
    document.getElementById('kpi-shows').textContent = showCount.toLocaleString();
    document.getElementById('kpi-shows-pct').textContent = `%${showPct}`;
    document.getElementById('kpi-active-year').textContent = peakYear;
    document.getElementById('kpi-active-year-sub').textContent = `${peakCount} yeni yapım`;

    // Summary Text items
    document.getElementById('stat-movies-pct-text').textContent = `%${moviePct}`;
    document.getElementById('stat-peak-year').textContent = peakYear;

    // Co-production calculation
    let coProductions = 0;
    state.titles.forEach(item => {
        if (item.country && item.country.includes(',')) {
            coProductions++;
        }
    });
    const coPct = ((coProductions / totalCount) * 100).toFixed(1);
    document.getElementById('stat-co-productions-pct').textContent = `%${coPct}`;
}

// Charts: Overview Pie Chart
function renderOverviewCharts() {
    const moviesCount = state.titles.filter(t => t.type === 'Movie').length;
    const showsCount = state.titles.filter(t => t.type === 'TV Show').length;

    const ctx = document.getElementById('pieChart').getContext('2d');

    if (state.charts.pie) {
        state.charts.pie.destroy();
    }

    state.charts.pie = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Filmler', 'Diziler'],
            datasets: [{
                data: [moviesCount, showsCount],
                backgroundColor: ['#E50914', '#2c2c2e'],
                borderColor: '#1c1c1e',
                borderWidth: 2,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#ffffff',
                        font: {
                            family: 'Outfit',
                            size: 13,
                            weight: '500'
                        },
                        padding: 20
                    }
                },
                tooltip: {
                    backgroundColor: '#1c1c1e',
                    titleColor: '#ffffff',
                    bodyColor: '#a0a0a5',
                    borderColor: '#2c2c2e',
                    borderWidth: 1,
                    padding: 10,
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const val = context.raw;
                            const pct = ((val / total) * 100).toFixed(1);
                            return ` ${context.label}: ${val.toLocaleString()} (${pct}%)`;
                        }
                    }
                }
            },
            cutout: '65%'
        }
    });
}

// Escape values from CSV before inserting them into table markup.
function escapeHtml(value) {
    const characters = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return String(value ?? '').replace(/[&<>"']/g, character => characters[character]);
}

// Country section: Table and Bar Chart
function renderCountrySection() {
    // 1. Table Render
    const tbody = document.querySelector('#country-summary-table tbody');
    tbody.innerHTML = '';

    // Grab top 10 countries from aggregate data
    const top10 = state.countryData.slice(0, 10);
    top10.forEach((row, i) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${i + 1}</strong></td>
            <td>${escapeHtml(row.country)}</td>
            <td>${parseInt(row.Movie || 0).toLocaleString()}</td>
            <td>${parseInt(row['TV Show'] || 0).toLocaleString()}</td>
            <td><strong>${parseInt(row.Total || 0).toLocaleString()}</strong></td>
        `;
        tbody.appendChild(tr);
    });

    // 2. Bar Chart Render (Top 15 Countries)
    const top15 = state.countryData.slice(0, 15);
    const labels = top15.map(r => r.country);
    const moviesData = top15.map(r => parseInt(r.Movie || 0));
    const showsData = top15.map(r => parseInt(r['TV Show'] || 0));

    const ctx = document.getElementById('countryBarChart').getContext('2d');

    if (state.charts.country) {
        state.charts.country.destroy();
    }

    state.charts.country = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Filmler',
                    data: moviesData,
                    backgroundColor: '#E50914',
                    borderWidth: 0,
                    borderRadius: 4
                },
                {
                    label: 'Diziler',
                    data: showsData,
                    backgroundColor: '#e5e5e5',
                    borderWidth: 0,
                    borderRadius: 4
                }
            ]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    stacked: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#6e6e73',
                        font: { family: 'Outfit' }
                    }
                },
                y: {
                    stacked: true,
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#ffffff',
                        font: { family: 'Outfit', weight: '500' }
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        color: '#ffffff',
                        font: { family: 'Outfit', size: 12 }
                    }
                },
                tooltip: {
                    backgroundColor: '#1c1c1e',
                    titleColor: '#ffffff',
                    bodyColor: '#a0a0a5',
                    borderColor: '#2c2c2e',
                    borderWidth: 1,
                    padding: 10
                }
            }
        }
    });
}

// Filter Country Chart Dynamically
function updateCountryChartFilter(type) {
    if (!state.charts.country) return;

    const top15 = state.countryData.slice(0, 15);
    const moviesData = top15.map(r => parseInt(r.Movie || 0));
    const showsData = top15.map(r => parseInt(r['TV Show'] || 0));

    if (type === 'Movie') {
        state.charts.country.data.datasets[0].hidden = false;
        state.charts.country.data.datasets[1].hidden = true;
        state.charts.country.options.scales.x.stacked = false;
        state.charts.country.options.scales.y.stacked = false;
    } else if (type === 'TV Show') {
        state.charts.country.data.datasets[0].hidden = true;
        state.charts.country.data.datasets[1].hidden = false;
        state.charts.country.options.scales.x.stacked = false;
        state.charts.country.options.scales.y.stacked = false;
    } else {
        state.charts.country.data.datasets[0].hidden = false;
        state.charts.country.data.datasets[1].hidden = false;
        state.charts.country.options.scales.x.stacked = true;
        state.charts.country.options.scales.y.stacked = true;
    }

    state.charts.country.update();
}

// Growth trends section
function renderGrowthSection() {
    // Sort yearly data by year ascending
    const sortedGrowth = [...state.yearlyData].sort((a, b) => parseInt(a.release_year) - parseInt(b.release_year));

    // Filter out rows below 1990
    const filteredGrowth = sortedGrowth.filter(r => parseInt(r.release_year) >= 1990);

    const years = filteredGrowth.map(r => r.release_year);
    const moviesGrowth = filteredGrowth.map(r => parseInt(r.Movie || 0));
    const showsGrowth = filteredGrowth.map(r => parseInt(r['TV Show'] || 0));

    const ctx = document.getElementById('growthLineChart').getContext('2d');

    // Create Gradients for area fills
    const moviesGradient = ctx.createLinearGradient(0, 0, 0, 300);
    moviesGradient.addColorStop(0, 'rgba(229, 9, 20, 0.4)');
    moviesGradient.addColorStop(1, 'rgba(229, 9, 20, 0)');

    const showsGradient = ctx.createLinearGradient(0, 0, 0, 300);
    showsGradient.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
    showsGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    if (state.charts.growth) {
        state.charts.growth.destroy();
    }

    state.charts.growth = new Chart(ctx, {
        type: 'line',
        data: {
            labels: years,
            datasets: [
                {
                    label: 'Filmler',
                    data: moviesGrowth,
                    borderColor: '#E50914',
                    borderWidth: 3,
                    pointBackgroundColor: '#E50914',
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    fill: true,
                    backgroundColor: moviesGradient,
                    tension: 0.3
                },
                {
                    label: 'Diziler',
                    data: showsGrowth,
                    borderColor: '#ffffff',
                    borderWidth: 3,
                    pointBackgroundColor: '#ffffff',
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    fill: true,
                    backgroundColor: showsGradient,
                    tension: 0.3
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#6e6e73',
                        font: { family: 'Outfit' },
                        maxTicksLimit: 15
                    }
                },
                y: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#6e6e73',
                        font: { family: 'Outfit' }
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        color: '#ffffff',
                        font: { family: 'Outfit', size: 12 }
                    }
                },
                tooltip: {
                    backgroundColor: '#1c1c1e',
                    titleColor: '#ffffff',
                    bodyColor: '#a0a0a5',
                    borderColor: '#2c2c2e',
                    borderWidth: 1,
                    padding: 10
                }
            }
        }
    });

    if (years.length > 0) {
        document.getElementById('year-range-label').textContent = `${years[0]} - ${years[years.length - 1]}`;
    }
}

// Explorer: Initialize Dropdowns dynamically from dataset
function initExplorerFilters() {
    const countriesSet = new Set();
    const ratingsSet = new Set();
    const yearsSet = new Set();

    state.titles.forEach(item => {
        // Expand countries if list
        if (item.country) {
            item.country.split(',').forEach(c => countriesSet.add(c.trim()));
        }
        if (item.rating) ratingsSet.add(item.rating.trim());
        if (item.release_year) yearsSet.add(item.release_year.trim());
    });

    // Populate country selector
    const countrySelect = document.getElementById('filter-country');
    if (countrySelect) {
        countrySelect.innerHTML = '<option value="all">Tüm Ülkeler</option>';
        Array.from(countriesSet).sort().forEach(country => {
            if (country) {
                const opt = document.createElement('option');
                opt.value = country;
                opt.textContent = country;
                countrySelect.appendChild(opt);
            }
        });
    }

    // Populate rating selector
    const ratingSelect = document.getElementById('filter-rating');
    if (ratingSelect) {
        ratingSelect.innerHTML = '<option value="all">Tüm Dereceler</option>';
        Array.from(ratingsSet).sort().forEach(rating => {
            if (rating) {
                const opt = document.createElement('option');
                opt.value = rating;
                opt.textContent = rating;
                ratingSelect.appendChild(opt);
            }
        });
    }

    // Populate year selector
    const yearSelect = document.getElementById('filter-year');
    if (yearSelect) {
        yearSelect.innerHTML = '<option value="all">Tüm Yıllar</option>';
        Array.from(yearsSet).sort((a,b) => parseInt(b) - parseInt(a)).forEach(year => {
            if (year) {
                const opt = document.createElement('option');
                opt.value = year;
                opt.textContent = year;
                yearSelect.appendChild(opt);
            }
        });
    }
}

// Apply Filters to raw titles and update Explorer list
function applyExplorerFilters() {
    const { searchQuery, type, country, rating, year } = state.explorer;

    state.filteredTitles = state.titles.filter(item => {
        // 1. Search Query (check Title, Director, Cast, Description)
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const titleMatch = item.title && item.title.toLowerCase().includes(query);
            const directorMatch = item.director && item.director.toLowerCase().includes(query);
            const castMatch = item.cast && item.cast.toLowerCase().includes(query);
            const descMatch = item.description && item.description.toLowerCase().includes(query);

            if (!titleMatch && !directorMatch && !castMatch && !descMatch) {
                return false;
            }
        }

        // 2. Type filter
        if (type !== 'all' && item.type !== type) return false;

        // 3. Country filter
        if (country !== 'all') {
            if (!item.country || !item.country.includes(country)) return false;
        }

        // 4. Rating filter
        if (rating !== 'all' && item.rating !== rating) return false;

        // 5. Year filter
        if (year !== 'all' && item.release_year !== year) return false;

        return true;
    });

    // Update result count display
    document.getElementById('results-count').textContent = `Toplam ${state.filteredTitles.length.toLocaleString()} sonuç bulundu`;

    renderExplorerTable();
}

// Render data table rows
function renderExplorerTable() {
    const tbody = document.querySelector('#explorer-table tbody');
    tbody.innerHTML = '';

    const { currentPage, pageSize } = state.explorer;
    const totalResults = state.filteredTitles.length;
    const totalPages = Math.ceil(totalResults / pageSize) || 1;

    // Boundary check
    if (state.explorer.currentPage > totalPages) {
        state.explorer.currentPage = totalPages;
    }

    // Slice current page data
    const startIndex = (state.explorer.currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, totalResults);
    const pageData = state.filteredTitles.slice(startIndex, endIndex);

    if (pageData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 2rem;">Aranan kriterlere uygun içerik bulunamadı.</td></tr>`;
    } else {
        pageData.forEach(item => {
            const tr = document.createElement('tr');

            // Badge style for types
            const badgeClass = item.type === 'Movie' ? 'badge-movie' : 'badge-show';
            const typeLabel = item.type === 'Movie' ? 'Film' : 'Dizi';

            tr.innerHTML = `
                <td style="color: var(--netflix-red); font-weight:600;">${escapeHtml(item.show_id)}</td>
                <td><span class="table-badge ${badgeClass}">${typeLabel}</span></td>
                <td title="${escapeHtml(item.title)}"><strong>${escapeHtml(item.title)}</strong></td>
                <td title="${escapeHtml(item.director)}">${escapeHtml(item.director) || '<span class="text-muted">Bilinmiyor</span>'}</td>
                <td title="${escapeHtml(item.country)}">${escapeHtml(item.country) || '<span class="text-muted">-</span>'}</td>
                <td>${escapeHtml(item.release_year)}</td>
                <td>${escapeHtml(item.duration)}</td>
                <td title="${escapeHtml(item.listed_in)}">${escapeHtml(item.listed_in)}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    // Update page indicator and buttons
    document.getElementById('page-indicator').textContent = `Sayfa ${state.explorer.currentPage} / ${totalPages}`;

    document.getElementById('prev-page-btn').disabled = state.explorer.currentPage === 1;
    document.getElementById('next-page-btn').disabled = state.explorer.currentPage === totalPages;
}

// Action: Trigger Python Analysis API
async function handleRunAnalysis() {
    const btn = document.getElementById('run-analysis-btn');
    if (!btn || btn.classList.contains('loading')) return;

    btn.classList.add('loading');
    btn.disabled = true;

    // Change play icon to loading rotation
    const icon = btn.querySelector('i');
    const originalIconName = icon.getAttribute('data-lucide');
    icon.setAttribute('data-lucide', 'loader-2');
    lucide.createIcons();

    btn.querySelector('span').textContent = 'Analiz Yapılıyor...';
    showToast('Netflix veri seti analizi başlatıldı. Lütfen bekleyin...', 'info');

    try {
        const response = await fetch('/api/run-analysis', {
            method: 'POST'
        });
        const result = await response.json();

        if (result.status === 'success') {
            showToast('Analiz başarıyla tamamlandı ve grafik verileri güncellendi!');

            // Reload dashboard data
            await loadDashboardData();
        } else {
            showToast(`Hata: ${result.message}`, 'error');
        }
    } catch (e) {
        console.error('API Call failed:', e);
        showToast('Sunucu ile iletişim kurulamadı!', 'error');
    } finally {
        // Reset button state
        btn.classList.remove('loading');
        btn.disabled = false;
        icon.setAttribute('data-lucide', originalIconName);
        lucide.createIcons();
        btn.querySelector('span').textContent = 'Analizi Yeniden Çalıştır';
    }
}
