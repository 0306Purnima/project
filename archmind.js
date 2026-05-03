// ── DATA CORE ──
const DB_KEY      = 'archmind_db_v5';
const SESSION_KEY = 'archmind_session';
const REQ_KEY     = 'archmind_requests_v1';
const SAVED_KEY   = 'archmind_saved';

const RS = {
    PENDING:       'pending',
    NEGOTIATING:   'negotiating',
    ACCEPTED:      'accepted',
    ADVANCE_PAID:  'advance_paid',
    IN_PROGRESS:   'in_progress',
    COMPLETED:     'completed',
    FINAL_PAYMENT: 'final_payment',
    RATED:         'rated',
    REJECTED:      'rejected',
    CANCELLED:     'cancelled',
    REFUNDED:      'refunded',
};

const STATUS_COLORS = {
    [RS.PENDING]:       '#f8c146',
    [RS.NEGOTIATING]:   '#38bdf8',
    [RS.ACCEPTED]:      '#a78bfa',
    [RS.ADVANCE_PAID]:  '#34d399',
    [RS.IN_PROGRESS]:   '#34d399',
    [RS.COMPLETED]:     '#f8c146',
    [RS.FINAL_PAYMENT]: '#6ee7b7',
    [RS.RATED]:         '#c6a7e4',
    [RS.REJECTED]:      '#f87171',
    [RS.CANCELLED]:     '#f87171',
    [RS.REFUNDED]:      '#fb923c',
};

const getDB          = () => { try { return JSON.parse(localStorage.getItem(DB_KEY) || '[]'); } catch { return []; } };
const saveDB         = data => localStorage.setItem(DB_KEY, JSON.stringify(data));
const getCurrentUser = () => { try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch { return null; } };
const setCurrentUser = user => localStorage.setItem(SESSION_KEY, JSON.stringify(user));

function updateUserField(patch) {
    const db = getDB(), user = getCurrentUser();
    if (!user) return;
    const idx = db.findIndex(u => u.email === user.email);
    if (idx === -1) return;
    db[idx] = { ...db[idx], ...patch };
    saveDB(db);
    setCurrentUser(db[idx]);
}

// ── NAVIGATION ──
function show(sectionId) {
    document.querySelectorAll('.form-content').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(sectionId);
    if (target) target.classList.add('active');
    const titles = {
        loginSect:  'Sign in to your professional workspace',
        regSect:    'Create your ArchMind account',
        detailSect: 'Complete your professional profile'
    };
    const titleEl = document.getElementById('mainTitle');
    if (titleEl && titles[sectionId]) titleEl.textContent = titles[sectionId];
}

const logout = () => { localStorage.removeItem(SESSION_KEY); window.location.href = 'login.html'; };

function goToRequest(targetEmail, targetName, postRef) {
    let url = `request.html?toEmail=${encodeURIComponent(targetEmail)}&toName=${encodeURIComponent(targetName)}`;
    if (postRef) {
        url += `&postId=${encodeURIComponent(postRef.id || '')}`;
        url += `&postTitle=${encodeURIComponent(postRef.title || '')}`;
        url += `&postImg=${encodeURIComponent(postRef.image || postRef.img || '')}`;
        url += `&postType=${encodeURIComponent(postRef.subType || postRef.category || '')}`;
    }
    window.location.href = url;
}

// ── AUTHENTICATION ──
function handleLogin(e) {
    if (e) e.preventDefault();
    const email = document.getElementById('lEmail').value.trim().toLowerCase();
    const pass  = document.getElementById('lPass').value;
    if (!email || !pass) return alert('Please fill in all fields.');
    const user = getDB().find(u => u.email === email && u.pass === pass);
    if (user) { setCurrentUser(user); window.location.href = 'profile.html'; }
    else alert('Invalid email or password.');
}

let _tempReg = null;

function nextStep() {
    const username = document.getElementById('rUser').value.trim();
    const name     = document.getElementById('rName').value.trim();
    const email    = document.getElementById('rEmail').value.trim().toLowerCase();
    const pass     = document.getElementById('rPass').value;
    const role     = document.getElementById('rRole').value;

    if (!username || !name || !email || !pass || !role) return alert('Please fill in all fields.');
    if (pass.length < 8) return alert('Password must be at least 8 characters.');

    const db = getDB();
    if (db.some(u => u.email === email))    return alert('An account with this email already exists.');
    if (db.some(u => u.username === username)) return alert('That username is already taken.');

    _tempReg = { username, name, email, pass, role };
    show('detailSect');

    const box = document.getElementById('dynamicInputs');
    let roleFields = '';
    if (role === 'designer' || role === 'architect') {
        roleFields = `
            <div class="section-label">Professional Details</div>
            <input class="span-2" type="text" id="rLoc"     placeholder="Office Location / City">
            <input class="span-2" type="text" id="rLicense" placeholder="License / Registration No.">
            <textarea class="span-2" id="rBio" rows="3" placeholder="Your design philosophy…"></textarea>`;
    } else if (role === 'maintenance') {
        roleFields = `
            <div class="section-label">Service Details</div>
            <input class="span-2" type="text" id="rLoc"  placeholder="Service Area / City">
            <input class="span-2" type="text" id="rSpec" placeholder="Specialisation (e.g. Plumbing, HVAC)">`;
    } else {
        roleFields = `
            <div class="section-label">Your Details</div>
            <input class="span-2" type="text" id="rLoc" placeholder="Your City">`;
    }

    const paymentFields = `
        <div class="section-label">Payment Details</div>
        <p class="span-2" style="font-size:12px;color:var(--text-dim);margin:0 0 4px;">
            Add how clients can pay you. You can update this later from your profile.
        </p>
        <div class="pay-toggle span-2" id="payToggle">
            <div class="pay-opt active" data-method="bank"   onclick="switchPayMethod('bank')">🏦 Bank Transfer</div>
            <div class="pay-opt"        data-method="upi"    onclick="switchPayMethod('upi')">📱 UPI / Mobile</div>
            <div class="pay-opt"        data-method="wallet" onclick="switchPayMethod('wallet')">💳 Wallet / Other</div>
        </div>
        <div class="pay-fields span-2" id="payBank">
            <input type="text" id="rBankName"  placeholder="Bank Name">
            <input type="text" id="rAccHolder" placeholder="Account Holder Name">
            <input type="text" id="rAccNumber" placeholder="Account Number">
            <input type="text" id="rIFSC"      placeholder="IFSC / SWIFT Code">
        </div>
        <div class="pay-fields span-2" id="payUPI" style="display:none;">
            <input type="text" id="rUPI"     placeholder="UPI ID (e.g. name@upi)">
            <input type="text" id="rUPIName" placeholder="Registered Name">
        </div>
        <div class="pay-fields span-2" id="payWallet" style="display:none;">
            <input type="text" id="rWalletType"   placeholder="Wallet / Service (e.g. PayPal, Paytm)">
            <input type="text" id="rWalletHandle" placeholder="Account / Handle">
        </div>`;

    box.innerHTML = roleFields + paymentFields;
}

function switchPayMethod(method) {
    document.querySelectorAll('.pay-opt').forEach(el => el.classList.toggle('active', el.dataset.method === method));
    document.getElementById('payBank').style.display   = method === 'bank'   ? 'flex' : 'none';
    document.getElementById('payUPI').style.display    = method === 'upi'    ? 'flex' : 'none';
    document.getElementById('payWallet').style.display = method === 'wallet' ? 'flex' : 'none';
}

function finalizeRegister() {
    if (!_tempReg) return show('regSect');

    const loc     = (document.getElementById('rLoc')?.value     || '').trim();
    const bio     = (document.getElementById('rBio')?.value     || 'New ArchMind member.').trim();
    const license = (document.getElementById('rLicense')?.value || '').trim();
    const spec    = (document.getElementById('rSpec')?.value    || '').trim();

    const activeMethod = document.querySelector('.pay-opt.active')?.dataset.method || 'bank';
    let payment = { method: activeMethod };
    if (activeMethod === 'bank') {
        payment = {
            method:    'bank',
            bankName:  (document.getElementById('rBankName')?.value   || '').trim(),
            accHolder: (document.getElementById('rAccHolder')?.value  || '').trim(),
            accNumber: (document.getElementById('rAccNumber')?.value  || '').trim(),
            ifsc:      (document.getElementById('rIFSC')?.value       || '').trim(),
        };
    } else if (activeMethod === 'upi') {
        payment = {
            method:  'upi',
            upiId:   (document.getElementById('rUPI')?.value     || '').trim(),
            upiName: (document.getElementById('rUPIName')?.value || '').trim(),
        };
    } else if (activeMethod === 'wallet') {
        payment = {
            method:       'wallet',
            walletType:   (document.getElementById('rWalletType')?.value   || '').trim(),
            walletHandle: (document.getElementById('rWalletHandle')?.value || '').trim(),
        };
    }

    const newUser = {
        ..._tempReg,
        photo:          `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(_tempReg.username)}`,
        bio, location: loc, license, specialisation: spec, payment,
        workRegistry:  { locations: loc ? [loc] : [], services: spec ? [spec] : [] },
        posts: [], requests: [],
        signupDate: new Date().toISOString()
    };

    const db = getDB();
    db.push(newUser);
    saveDB(db);
    setCurrentUser(newUser);
    _tempReg = null;
    window.location.href = 'profile.html';
}

// ── PROFILE PAGE ──
function renderProfile() {
    const user  = getCurrentUser();
    const shell = document.getElementById('profileShell');
    if (!user || !shell) return;

    const isPro         = user.role === 'designer' || user.role === 'architect';
    const isMaintenance = user.role === 'maintenance';

    shell.innerHTML = `
        <nav class="main-nav">
            <div class="nav-container">
                <div class="logo">ARCHMIND</div>
                <div class="nav-links">
                    <a href="Archmind.html">Home</a>
                    ${isPro ? '<a href="post.html">Post Work</a>' : ''}
                    <a href="request.html">Send Request</a>
                    <a href="#" onclick="logout()">Logout</a>
                </div>
            </div>
        </nav>

        <div class="container">
            <section class="profile-header-card">
                <img src="${user.photo}" id="profilePic" class="large-avatar" alt="Avatar">

                <div id="display-fields" style="flex:1;">
                    <h1 style="margin:0 0 6px;font-size:1.6rem;">${user.username}</h1>
                    <p class="user-email">${user.email} &bull; <span class="badge">${user.role}</span></p>
                    <p class="user-bio">${user.bio}</p>
                    ${user.location ? `<p style="color:var(--text-secondary);font-size:0.85rem;margin:4px 0;">📍 ${user.location}</p>` : ''}
                    ${user.avgRating ? `
                    <div class="pub-rating-row">
                        ${[1,2,3,4,5].map(n => `<span class="star ${n <= Math.round(user.avgRating) ? 'star-filled' : ''}">★</span>`).join('')}
                        <span class="pub-rating-val">${user.avgRating} / 5</span>
                        <span class="pub-rating-count">(${user.ratingCount} review${user.ratingCount !== 1 ? 's' : ''})</span>
                    </div>` : ''}
                    ${user.payment ? renderPaymentBadge(user.payment) : ''}
                    <div style="display:flex;gap:10px;margin-top:14px;flex-wrap:wrap;">
                        <button class="btn-outline" onclick="toggleEditProfile()">✏️ Edit Profile</button>
                        ${isPro ? `<button class="btn-save" onclick="window.location.href='post.html'">+ Post Work</button>` : ''}
                    </div>
                </div>

                <div id="edit-fields" style="display:none;flex:1;width:100%;">
                    <label class="field-label">Profile Photo</label>
                    <div style="display:flex;align-items:center;gap:14px;margin-bottom:14px;">
                        <img src="${user.photo}" id="editAvatarPreview"
                             style="width:80px;height:80px;object-fit:cover;border-radius:14px;border:1px solid var(--border);">
                        <div>
                            <input type="file" id="fileInput" accept="image/*" style="display:none"
                                   onchange="processImageUpload(event)">
                            <button class="btn-outline" style="padding:8px 14px;font-size:0.82rem;"
                                    onclick="document.getElementById('fileInput').click()">Choose Photo</button>
                        </div>
                    </div>
                    <label class="field-label">Bio</label>
                    <textarea id="editBio" class="form-control" rows="3">${user.bio}</textarea>
                    <label class="field-label">Location</label>
                    <input type="text" id="editLocation" class="form-control"
                           value="${user.location || ''}" placeholder="City / Area">
                    <label class="field-label">Payment Method</label>
                    ${renderPaymentEditForm(user.payment)}
                    <div style="display:flex;gap:10px;margin-top:16px;">
                        <button class="btn-save"    onclick="saveProfileChanges()">Save Changes</button>
                        <button class="btn-outline" onclick="toggleEditProfile()">Cancel</button>
                    </div>
                </div>
            </section>

            <div class="dash-stack">
                ${(isPro || isMaintenance) ? `
                <div class="dash-card highlighted">
                    <div class="dash-header" onclick="toggleSection('incomingRequestsBody')">
                        <h3>📥 Incoming Requests</h3>
                        <span class="dash-toggle" id="incomingRequestsToggle">▲</span>
                    </div>
                    <div class="dash-body scrollable" id="incomingRequestsBody">
                        <p class="empty-text">Loading…</p>
                    </div>
                </div>` : ''}

                <div class="dash-card">
                    <div class="dash-header" onclick="toggleSection('sentRequestsBody')">
                        <h3>📤 My Sent Requests</h3>
                        <span class="dash-toggle" id="sentRequestsToggle">▲</span>
                    </div>
                    <div class="dash-body scrollable" id="sentRequestsBody">
                        <p class="empty-text">Loading…</p>
                    </div>
                </div>

                ${isPro ? `
                <div class="dash-card">
                    <div class="dash-header" onclick="toggleSection('portfolioBody')">
                        <h3>🗂 My Portfolio</h3>
                        <span class="dash-toggle" id="portfolioToggle">▲</span>
                    </div>
                    <div class="dash-body" id="portfolioBody">
                        <div class="grid-container" id="portfolioGrid"></div>
                    </div>
                </div>` : ''}

                ${isMaintenance ? `
                <div class="dash-card highlighted">
                    <div class="dash-header" onclick="toggleSection('registryBody')">
                        <h3>🔧 Expand Workspace</h3>
                        <span class="dash-toggle" id="registryToggle">▲</span>
                    </div>
                    <div class="dash-body" id="registryBody">
                        <form onsubmit="handleExpansionSubmit(event)"
                              style="display:flex;flex-direction:column;gap:10px;">
                            <input type="text" id="expLocInput" class="form-control"
                                   placeholder="Add Location (City/Area)">
                            <input list="serviceList" id="expSerInput" class="form-control"
                                   placeholder="Add Service">
                            <datalist id="serviceList">
                                <option value="Plumbing"><option value="Electrical">
                                <option value="HVAC Repair"><option value="Carpentry">
                                <option value="Painting"><option value="Tiling">
                                <option value="Roofing">
                            </datalist>
                            <button type="submit" class="btn-save">Update Registry</button>
                        </form>
                        <div style="margin-top:14px;font-size:0.85rem;border-top:1px solid var(--border);padding-top:10px;">
                            <strong>Locations:</strong> ${user.workRegistry?.locations?.join(', ') || 'None'}<br>
                            <strong>Services:</strong>  ${user.workRegistry?.services?.join(', ')  || 'None'}
                        </div>
                    </div>
                </div>` : ''}
            </div>
        </div>`;

    if (isPro) {
        const grid = document.getElementById('portfolioGrid');
        if (grid) {
            if (!user.posts || user.posts.length === 0) {
                grid.innerHTML = '<p class="empty-text">No portfolio items yet.</p>';
            } else {
                user.posts.forEach(post => grid.appendChild(buildOptionCard(post, 'own')));
            }
        }
    }

    setTimeout(() => {
        const sentEl     = document.getElementById('sentRequestsBody');
        const incomingEl = document.getElementById('incomingRequestsBody');
        if (sentEl)     renderSentRequests(sentEl);
        if (incomingEl) renderIncomingRequests(incomingEl);
    }, 0);
}

// ── PUBLIC PROFILE ──
function renderPublicUser(user, container) {
    const currentUser = getCurrentUser();

    container.innerHTML = `
        <nav class="main-nav">
            <div class="nav-container">
                <div class="logo">ARCHMIND</div>
                <div class="nav-links">
                    <a href="Archmind.html">Home</a>
                    ${currentUser ? `<a href="profile.html">My Profile</a>` : `<a href="login.html">Login</a>`}
                </div>
            </div>
        </nav>

        <div class="container">
            <section class="profile-header-card">
                <img src="${user.photo}" class="large-avatar" alt="${user.username}">
                <div style="flex:1;">
                    <h1 style="margin:0 0 6px;font-size:1.6rem;">${user.username}</h1>
                    <p class="user-email">${user.email} &bull; <span class="badge">${user.role}</span></p>
                    <p class="user-bio">${user.bio}</p>
                    ${user.location ? `<p style="color:var(--muted);font-size:0.85rem;margin:4px 0;">📍 ${user.location}</p>` : ''}
                    ${user.avgRating ? `
                    <div class="pub-rating-row">
                        ${[1,2,3,4,5].map(n => `<span class="star ${n <= Math.round(user.avgRating) ? 'star-filled' : ''}">★</span>`).join('')}
                        <span class="pub-rating-val">${user.avgRating} / 5</span>
                        <span class="pub-rating-count">(${user.ratingCount} review${user.ratingCount !== 1 ? 's' : ''})</span>
                    </div>` : ''}
                    <div style="margin-top:14px;">
                        <button class="btn-save" id="pub-req-btn">
                            Send Request to ${user.username}
                        </button>
                    </div>
                </div>
            </section>

            <div class="dash-card">
                <div class="dash-header" onclick="toggleSection('pubPortfolioBody')">
                    <h3>🗂 Portfolio</h3>
                    <span class="dash-toggle" id="pubPortfolioToggle">▲</span>
                </div>
                <div class="dash-body" id="pubPortfolioBody">
                    <div class="grid-container" id="pubPortfolioGrid"></div>
                </div>
            </div>
        </div>`;

    const pubGrid = document.getElementById('pubPortfolioGrid');
    if (pubGrid) {
        if (!user.posts || user.posts.length === 0) {
            pubGrid.innerHTML = '<p class="empty-text">No work showcased yet.</p>';
        } else {
            user.posts.forEach(post => pubGrid.appendChild(buildOptionCard(post, 'public')));
        }
    }

    // Wire the Send Request button safely via addEventListener
    const pubReqBtn = document.getElementById('pub-req-btn');
    if (pubReqBtn) {
        pubReqBtn.addEventListener('click', () => {
            window.location.href = 'request.html'
                + '?toEmail=' + encodeURIComponent(user.email    || '')
                + '&toName='  + encodeURIComponent(user.username || '');
        });
    }
}

// ── PROFILE EDIT HELPERS ──
function toggleEditProfile() {
    const edit    = document.getElementById('edit-fields');
    const display = document.getElementById('display-fields');
    if (!edit || !display) return;
    const editing = edit.style.display === 'block';
    edit.style.display    = editing ? 'none'  : 'block';
    display.style.display = editing ? 'block' : 'none';
}

function processImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 2097152) return alert('Image too large — keep it under 2 MB.');
    const reader = new FileReader();
    reader.onload = e => {
        const preview = document.getElementById('editAvatarPreview');
        if (preview) { preview.src = e.target.result; preview.setAttribute('data-new-image', e.target.result); }
    };
    reader.readAsDataURL(file);
}

function saveProfileChanges() {
    const bio      = document.getElementById('editBio').value.trim();
    const location = document.getElementById('editLocation').value.trim();
    const preview  = document.getElementById('editAvatarPreview');
    const photo    = preview.getAttribute('data-new-image') || preview.src;

    const activeMethod = document.querySelector('#editPayToggle .pay-opt.active')?.dataset.method
                         || getCurrentUser()?.payment?.method || 'bank';
    let payment = { method: activeMethod };
    if (activeMethod === 'bank') {
        payment = {
            method:    'bank',
            bankName:  (document.getElementById('epBankName')?.value  || '').trim(),
            accHolder: (document.getElementById('epAccHolder')?.value || '').trim(),
            accNumber: (document.getElementById('epAccNumber')?.value || '').trim(),
            ifsc:      (document.getElementById('epIFSC')?.value      || '').trim(),
        };
    } else if (activeMethod === 'upi') {
        payment = {
            method:  'upi',
            upiId:   (document.getElementById('epUPI')?.value     || '').trim(),
            upiName: (document.getElementById('epUPIName')?.value || '').trim(),
        };
    } else if (activeMethod === 'wallet') {
        payment = {
            method:       'wallet',
            walletType:   (document.getElementById('epWalletType')?.value   || '').trim(),
            walletHandle: (document.getElementById('epWalletHandle')?.value || '').trim(),
        };
    }

    updateUserField({ bio, location, photo, payment });
    renderProfile();
}

function handleExpansionSubmit(e) {
    e.preventDefault();
    const user = getCurrentUser();
    if (!user) return;
    const registry = user.workRegistry || { locations: [], services: [] };
    let changed = false;
    const locVal = document.getElementById('expLocInput')?.value.trim();
    const serVal = document.getElementById('expSerInput')?.value.trim();
    if (locVal) { registry.locations.push(locVal); changed = true; }
    if (serVal) { registry.services.push(serVal);  changed = true; }
    if (changed) { updateUserField({ workRegistry: registry }); renderProfile(); }
}

function switchEditPayMethod(method) {
    document.querySelectorAll('#editPayToggle .pay-opt').forEach(el => el.classList.toggle('active', el.dataset.method === method));
    document.getElementById('epBank').style.display   = method === 'bank'   ? 'flex' : 'none';
    document.getElementById('epUPIDiv').style.display = method === 'upi'    ? 'flex' : 'none';
    document.getElementById('epWallet').style.display = method === 'wallet' ? 'flex' : 'none';
}

// ── PAYMENT RENDER HELPERS ──
function renderPaymentBadge(payment) {
    if (!payment || !payment.method) return '';
    const icons = { bank: '🏦', upi: '📱', wallet: '💳' };
    let detail = '';
    if (payment.method === 'bank')   detail = payment.bankName   ? `${payment.bankName} ···${(payment.accNumber||'').slice(-4)}` : '';
    if (payment.method === 'upi')    detail = payment.upiId      || '';
    if (payment.method === 'wallet') detail = `${payment.walletType || ''} — ${payment.walletHandle || ''}`;
    return `<div class="payment-info">
        <p>${icons[payment.method] || '💰'} <strong>${payment.method.toUpperCase()}</strong>${detail ? ` &nbsp;·&nbsp; ${detail}` : ''}</p>
    </div>`;
}

function renderPaymentEditForm(payment) {
    const m = payment?.method || 'bank';
    return `
        <div class="pay-toggle" id="editPayToggle" style="margin-bottom:10px;">
            <div class="pay-opt ${m==='bank'   ? 'active':''}" data-method="bank"   onclick="switchEditPayMethod('bank')">🏦 Bank</div>
            <div class="pay-opt ${m==='upi'    ? 'active':''}" data-method="upi"    onclick="switchEditPayMethod('upi')">📱 UPI</div>
            <div class="pay-opt ${m==='wallet' ? 'active':''}" data-method="wallet" onclick="switchEditPayMethod('wallet')">💳 Wallet</div>
        </div>
        <div class="pay-fields" id="epBank" style="display:${m==='bank'?'flex':'none'};flex-direction:column;gap:8px;">
            <input type="text" id="epBankName"  class="form-control" value="${payment?.bankName  || ''}" placeholder="Bank Name">
            <input type="text" id="epAccHolder" class="form-control" value="${payment?.accHolder || ''}" placeholder="Account Holder">
            <input type="text" id="epAccNumber" class="form-control" value="${payment?.accNumber || ''}" placeholder="Account Number">
            <input type="text" id="epIFSC"      class="form-control" value="${payment?.ifsc      || ''}" placeholder="IFSC / SWIFT">
        </div>
        <div class="pay-fields" id="epUPIDiv" style="display:${m==='upi'?'flex':'none'};flex-direction:column;gap:8px;">
            <input type="text" id="epUPI"     class="form-control" value="${payment?.upiId   || ''}" placeholder="UPI ID">
            <input type="text" id="epUPIName" class="form-control" value="${payment?.upiName || ''}" placeholder="Registered Name">
        </div>
        <div class="pay-fields" id="epWallet" style="display:${m==='wallet'?'flex':'none'};flex-direction:column;gap:8px;">
            <input type="text" id="epWalletType"   class="form-control" value="${payment?.walletType   || ''}" placeholder="Wallet / Service">
            <input type="text" id="epWalletHandle" class="form-control" value="${payment?.walletHandle || ''}" placeholder="Account / Handle">
        </div>`;
}

// ── POST — create, edit, delete ──
async function handlePostSubmit(e) {
    e.preventDefault();
    const user = getCurrentUser();
    if (!user) return alert('Please log in to post.');

    const title     = document.getElementById('title').value.trim();
    const desc      = document.getElementById('post-desc').value.trim();
    const budget    = document.getElementById('post-budget').value.trim();
    const fileInput = document.getElementById('file-input');

    if (!title) return alert('Please enter a project title.');

    const typeRadio = document.querySelector('input[name="type"]:checked');
    if (!typeRadio) return alert('Please select a Project Type.');
    const type = typeRadio.value;

    let subType = '';
    if (type === 'planning') subType = document.querySelector('input[list="planning-options"]')?.value || '';
    else if (type === 'design')   subType = document.querySelector('input[list="design-options"]')?.value   || '';
    else if (type === 'interior') subType = document.querySelector('input[list="interior-options"]')?.value || '';
    if (!subType) return alert('Please select a sub-category.');

    let imageUrl = 'https://placehold.co/600x400/1a1a2e/38bdf8?text=ArchMind';
    if (fileInput && fileInput.files.length > 0) imageUrl = await convertToBase64(fileInput.files[0]);

    const newPost = {
        id:          'post_' + Date.now(),
        authorEmail: user.email,
        authorName:  user.username,
        authorPhoto: user.photo || 'https://placehold.co/50',
        title, type, subType, desc, budget,
        image:   imageUrl,
        likes:   0,
        likedBy: [],
        date:    new Date().toLocaleDateString()
    };

    const db  = getDB();
    const idx = db.findIndex(u => u.email === user.email);
    if (idx === -1) return alert('Session error — please log in again.');
    db[idx].posts.unshift(newPost);
    saveDB(db);
    setCurrentUser(db[idx]);
    window.location.href = 'profile.html';
}

function previewPostImages(event) {
    const strip = document.getElementById('imagePreviewStrip');
    if (!strip) return;
    strip.innerHTML = '';
    Array.from(event.target.files).forEach(file => {
        const reader = new FileReader();
        reader.onload = e => {
            const img = document.createElement('img');
            img.src = e.target.result;
            strip.appendChild(img);
        };
        reader.readAsDataURL(file);
    });
}

function editPost(postId) {
    const db   = getDB();
    const user = getCurrentUser();
    if (!user) { alert('Please log in.'); return; }

    const uIdx = db.findIndex(u => u.email === user.email);
    if (uIdx === -1) return;

    const post = db[uIdx].posts.find(p => p.id === postId);
    if (!post) { alert('You do not have permission to edit this post.'); return; }
    if (post.authorEmail && post.authorEmail !== user.email) { alert('You do not have permission to edit this post.'); return; }

    document.getElementById('epTitle').value    = post.title  || '';
    document.getElementById('epDesc').value     = post.desc   || '';
    document.getElementById('epBudget').value   = post.budget || '';
    document.getElementById('epPostId').value   = postId;
    document.getElementById('epImgPreview').src = post.image;
    document.getElementById('epImgPreview').removeAttribute('data-new-image');
    document.getElementById('editPostModal').classList.add('open');
}

const closeEditModal = () => document.getElementById('editPostModal').classList.remove('open');

function previewEditImage(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 2097152) return alert('Image too large — keep it under 2 MB.');
    const reader = new FileReader();
    reader.onload = e => {
        const preview = document.getElementById('epImgPreview');
        preview.src = e.target.result;
        preview.setAttribute('data-new-image', e.target.result);
    };
    reader.readAsDataURL(file);
}

function saveEditedPost() {
    const postId = document.getElementById('epPostId').value;
    const db     = getDB();
    const user   = getCurrentUser();
    if (!user) return;

    const uIdx = db.findIndex(u => u.email === user.email);
    if (uIdx === -1) return;
    const pIdx = db[uIdx].posts.findIndex(p => p.id === postId);
    if (pIdx === -1) return;

    const preview  = document.getElementById('epImgPreview');
    const newImage = preview.getAttribute('data-new-image') || db[uIdx].posts[pIdx].image;

    db[uIdx].posts[pIdx] = {
        ...db[uIdx].posts[pIdx],
        title:  document.getElementById('epTitle').value.trim(),
        desc:   document.getElementById('epDesc').value.trim(),
        budget: document.getElementById('epBudget').value.trim(),
        image:  newImage,
    };

    saveDB(db);
    setCurrentUser(db[uIdx]);
    closeEditModal();
    renderProfile();
}

function deletePost(postId) {
    if (!confirm('Delete this project permanently?')) return;
    const db   = getDB();
    const user = getCurrentUser();
    if (!user) return;

    const uIdx = db.findIndex(u => u.email === user.email);
    if (uIdx === -1) return;

    if (!db[uIdx].posts.some(p => p.id === postId)) {
        alert('You do not have permission to delete this post.');
        return;
    }

    db[uIdx].posts = db[uIdx].posts.filter(p => p.id !== postId);
    saveDB(db);
    setCurrentUser(db[uIdx]);

    // Remove from saved/archive
    try {
        const sv = JSON.parse(localStorage.getItem(SAVED_KEY) || '{}');
        if (sv[postId]) { delete sv[postId]; localStorage.setItem(SAVED_KEY, JSON.stringify(sv)); }
    } catch(e) {}

    document.querySelectorAll('#' + CSS.escape(postId)).forEach(el => el.remove());
    if (document.getElementById('profileShell')) renderProfile();
}

// ── SECTION TOGGLE ──
function toggleSection(bodyId) {
    const body   = document.getElementById(bodyId);
    const toggle = document.getElementById(bodyId.replace('Body', 'Toggle'));
    if (!body) return;
    const isOpen = body.style.display !== 'none';
    body.style.display = isOpen ? 'none' : '';
    if (toggle) toggle.textContent = isOpen ? '▼' : '▲';
}

// ── LIGHTBOX ──
function openPostLightbox(post) {
    const img        = post.image || post.img || '';
    const title      = post.title || '';
    const desc       = post.desc  || post.description || '';
    const budget     = post.budget || '';
    const designer   = post.authorName || post.designer || 'ArchMind Studio';
    const profileUrl = post.authorEmail
        ? `profile.html?email=${encodeURIComponent(post.authorEmail)}`
        : (post.designerUrl || '#');
    const category   = (post.subType || post.category || '').replace(/-/g, ' ').toUpperCase();
    const date       = post.date || '';
    const isOwner    = getCurrentUser() && getCurrentUser().email === post.authorEmail;

    let lb = document.getElementById('postLightbox');
    if (!lb) {
        lb = document.createElement('div');
        lb.id = 'postLightbox';
        lb.setAttribute('role', 'dialog');
        lb.setAttribute('aria-modal', 'true');
        document.body.appendChild(lb);
        lb.addEventListener('click', e => { if (e.target === lb) closePostLightbox(); });
        document.addEventListener('keydown', _lbKeyHandler);
    }

    lb.innerHTML = `
        <div class="plb-inner">
            <button class="plb-close" onclick="closePostLightbox()" aria-label="Close">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
            </button>
            <div class="plb-img-side">
                <img src="${img}" alt="${title}">
                <div class="plb-img-overlay"><span class="plb-category">${category}</span></div>
            </div>
            <div class="plb-info-side">
                <div class="plb-scroll">
                    <span class="plb-eyebrow">${category || 'Design'}</span>
                    <h2 class="plb-title">${title}</h2>
                    ${desc ? `
                    <div class="plb-section">
                        <span class="plb-label">Description</span>
                        <p class="plb-desc">${desc}</p>
                    </div>` : ''}
                    ${budget ? `
                    <div class="plb-budget-box">
                        <span class="plb-label">Estimated Budget</span>
                        <div class="plb-budget-val">${budget}</div>
                    </div>` : ''}
                    ${date ? `
                    <div class="plb-section">
                        <span class="plb-label">Posted</span>
                        <span class="plb-meta-val">${date}</span>
                    </div>` : ''}
                    <div class="plb-divider"></div>
                    <div class="plb-author-row">
                        <div class="plb-author-avatar">${designer.charAt(0).toUpperCase()}</div>
                        <div class="plb-author-info">
                            <a href="${profileUrl}" class="plb-author-name">${designer}</a>
                            <span class="plb-author-role">${post.authorEmail ? 'Architect / Designer' : 'Curated Designer'}</span>
                        </div>
                    </div>
                    <div class="plb-actions">
                        ${isOwner ? `
                        <button class="plb-btn-secondary" data-action="plb-edit">Edit</button>
                        <button class="plb-btn-danger"    data-action="plb-delete">Delete</button>
                        ` : ''}
                        <button class="plb-btn-secondary" onclick="closePostLightbox()">Close</button>
                    </div>
                    <p class="plb-esc-hint">Press ESC to close</p>
                </div>
            </div>
        </div>`;

    lb.classList.add('plb-open');
    document.body.style.overflow = 'hidden';

    // Wire lightbox action buttons via addEventListener
    const plbEditBtn   = lb.querySelector('[data-action="plb-edit"]');
    const plbDeleteBtn = lb.querySelector('[data-action="plb-delete"]');

    if (plbEditBtn)   plbEditBtn.addEventListener('click',   () => { closePostLightbox(); editPost(post.id); });
    if (plbDeleteBtn) plbDeleteBtn.addEventListener('click', () => { closePostLightbox(); deletePost(post.id); });
}

function closePostLightbox() {
    const lb = document.getElementById('postLightbox');
    if (lb) { lb.classList.remove('plb-open'); setTimeout(() => { lb.innerHTML = ''; }, 300); }
    document.body.style.overflow = '';
}

const _lbKeyHandler = e => { if (e.key === 'Escape') closePostLightbox(); };
function openLightbox(itemOrSrc, title) {
    if (itemOrSrc && typeof itemOrSrc === 'object') openPostLightbox(itemOrSrc);
    else openPostLightbox({ image: itemOrSrc, img: itemOrSrc, title: title || '' });
}

const closeLightbox = () => closePostLightbox();

// ── DISCOVERY ──
function renderDiscoveryPosts() {
    getDB().forEach(user => {
        if (!user.posts) return;
        user.posts.forEach(post => {
            const grid = document.getElementById('grid-' + post.subType);
            if (!grid || document.getElementById(post.id)) return;
            grid.insertBefore(buildOptionCard(post, 'discovery'), grid.firstChild);
        });
    });
}

function buildOptionCard(post, mode = 'discovery') {
    const currentUser = getCurrentUser();
    const isAuthor    = currentUser && currentUser.email === post.authorEmail;
    const effectiveMode = mode === 'discovery' ? (isAuthor ? 'own' : 'public') : mode;

    let isSaved = false;
    if (typeof saved !== 'undefined') {
        isSaved = !!saved[post.id];
    } else {
        try { isSaved = !!(JSON.parse(localStorage.getItem(SAVED_KEY) || '{}')[post.id]); } catch(e) {}
    }

    const card = document.createElement('div');
    card.className = 'option-card';
    card.id = post.id;

    const bottomRow = effectiveMode === 'own'
        ? `<div class="card-designer">
                <span class="designer-dot"></span>
                <a href="profile.html?email=${encodeURIComponent(post.authorEmail)}">${post.authorName}</a>
                <div class="card-owner-btns">
                    <button class="btn-edit"   data-action="edit">Edit</button>
                    <button class="btn-delete" data-action="delete">Delete</button>
                </div>
           </div>`
        : `<div class="card-designer">
                <span class="designer-dot"></span>
                <a href="profile.html?email=${encodeURIComponent(post.authorEmail)}">${post.authorName}</a>
           </div>`;

    card.innerHTML = `
        <div class="card-img-wrap">
            <img src="${post.image}" alt="${post.title}" loading="lazy">
            ${mode === 'discovery' ? '<span class="card-user-badge">Community</span>' : ''}
            <button class="card-heart${isSaved ? ' saved' : ''}" data-id="${post.id}" aria-label="Save design">
                <svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            </button>
        </div>
        <div class="card-body">
            <div class="card-title">${post.title}</div>
            <div class="card-desc">${post.desc || ''}</div>
            ${post.budget ? `<div class="card-budget"><span class="budget-label">Budget</span>${post.budget}</div>` : ''}
            <div class="card-divider"></div>
            ${bottomRow}
        </div>`;

    card.querySelector('.card-img-wrap').addEventListener('click', e => {
        if (e.target.closest('.card-heart')) return;
        openPostLightbox(post);
    });

    // Edit / Delete buttons (own mode)
    const editBtn   = card.querySelector('[data-action="edit"]');
    const deleteBtn = card.querySelector('[data-action="delete"]');
    if (editBtn)   editBtn.addEventListener('click',   e => { e.stopPropagation(); editPost(post.id); });
    if (deleteBtn) deleteBtn.addEventListener('click', e => { e.stopPropagation(); deletePost(post.id); });

    card.querySelector('.card-heart').addEventListener('click', e => {
        e.stopPropagation();
        toggleSaved(e.currentTarget, {
            id:          post.id,
            img:         post.image || post.img || '',
            title:       post.title || '',
            desc:        post.desc  || '',
            budget:      post.budget || '',
            designer:    post.authorName || post.designer || 'ArchMind',
            designerUrl: post.authorEmail
                ? `profile.html?email=${encodeURIComponent(post.authorEmail)}`
                : (post.designerUrl || '#'),
            category:    post.subType || post.category || '',
        });
    });

    return card;
}

const convertToBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload  = () => resolve(reader.result);
    reader.onerror = err => reject(err);
});

// ── BOOT ──
window.addEventListener('DOMContentLoaded', () => {
    const params      = new URLSearchParams(window.location.search);
    const currentUser = getCurrentUser();

    // Login page
    const loginSect = document.getElementById('loginSect');
    if (loginSect) {
        if (currentUser) { window.location.href = 'profile.html'; return; }
        loginSect.addEventListener('keydown', e => { if (e.key === 'Enter') handleLogin(e); });
    }

    // Profile page
    const profileShell = document.getElementById('profileShell');
    if (profileShell) {
        const targetEmail = params.get('email');
        const decoded     = targetEmail ? decodeURIComponent(targetEmail) : null;

        if (decoded && decoded !== currentUser?.email) {
            const targetUser = getDB().find(u => u.email === decoded);
            if (targetUser) {
                renderPublicUser(targetUser, profileShell);
            } else {
                profileShell.innerHTML = `
                    <div style="text-align:center;padding:80px 20px;">
                        <h2>User not found</h2>
                        <a href="Archmind.html" style="color:var(--accent);">Back to Home</a>
                    </div>`;
            }
        } else if (decoded && currentUser && decoded === currentUser.email) {
            window.location.replace('profile.html');
        } else if (currentUser) {
            renderProfile();
        } else {
            window.location.href = 'login.html';
        }
    }

    // Post page
    const postForm = document.getElementById('post-form');
    if (postForm) {
        if (!currentUser) { window.location.href = 'login.html'; return; }
        postForm.addEventListener('submit', handlePostSubmit);

        const subTypeInputs = [
            document.querySelector('input[list="planning-options"]'),
            document.querySelector('input[list="design-options"]'),
            document.querySelector('input[list="interior-options"]')
        ].filter(Boolean);

        subTypeInputs.forEach(inp => { inp.disabled = true; inp.style.opacity = '0.35'; });

        document.querySelectorAll('input[name="type"]').forEach(radio => {
            radio.addEventListener('change', e => {
                const selected = e.target.value;
                subTypeInputs.forEach(inp => {
                    const match       = inp.getAttribute('list').includes(selected);
                    inp.disabled      = !match;
                    inp.style.opacity = match ? '1' : '0.35';
                    if (!match) inp.value = '';
                });
            });
        });
    }

    // Discovery pages
    if (document.querySelector('.option-grid')) renderDiscoveryPosts();

    // Saved / archive
    if (document.querySelector('.card-heart[data-id]')) {
        syncHeartStates();
        renderArchive();
    }

    // Request page — auto-fill
    const emailInput = document.getElementById('targetEmailInput');
    const nameInput  = document.getElementById('targetNameInput');
    const toEmail    = params.get('toEmail');
    const toName     = params.get('toName');
    if (emailInput && toEmail) emailInput.value = decodeURIComponent(toEmail);
    if (nameInput  && toName)  nameInput.value  = decodeURIComponent(toName);

    // Close edit modal on overlay click
    const modal = document.getElementById('editPostModal');
    if (modal) modal.addEventListener('click', e => { if (e.target === modal) closeEditModal(); });
});

// ── REQUEST WORKFLOW ──
const getRequests    = () => { try { return JSON.parse(localStorage.getItem(REQ_KEY) || '[]'); } catch { return []; } };
const saveRequests   = arr => localStorage.setItem(REQ_KEY, JSON.stringify(arr));
const getRequestById = id  => getRequests().find(r => r.id === id) || null;

function patchRequest(id, patch) {
    const reqs = getRequests();
    const idx  = reqs.findIndex(r => r.id === id);
    if (idx === -1) return null;
    reqs[idx] = { ...reqs[idx], ...patch, updatedAt: new Date().toISOString() };
    saveRequests(reqs);
    return reqs[idx];
}

function statusBadge(status) {
    const color = STATUS_COLORS[status] || '#94a3b8';
    const label = status.replace(/_/g, ' ').toUpperCase();
    return `<span class="req-status-badge" style="background:${color}22;color:${color};border-color:${color}44;">${label}</span>`;
}

function postServiceRequest(formData) {
    const user = getCurrentUser();
    if (!user) { window.location.href = 'login.html'; return; }

    const req = {
        id:           'req_' + Date.now(),
        senderEmail:  user.email,
        senderName:   user.username,
        targetEmail:  formData.targetEmail  || null,
        targetName:   formData.targetName   || null,
        serviceType:  formData.serviceType,
        title:        formData.title,
        details:      formData.details,
        budget:       { min: formData.budgetMin, max: formData.budgetMax },
        timeline:     formData.timeline,
        location:     formData.location,
        propertyType: formData.propertyType,
        extras:       formData.extras || {},
        status:       RS.PENDING,
        negotiation:  [],
        agreedAmount: null,
        advancePaid:  false,
        advanceAmount:null,
        refundAmount: null,
        createdAt:    new Date().toISOString(),
        updatedAt:    new Date().toISOString(),
    };

    const reqs = getRequests();
    reqs.unshift(req);
    saveRequests(reqs);
    return req;
}

// ── SENT REQUESTS ──
function renderSentRequests(containerEl) {
    const user = getCurrentUser();
    if (!user || !containerEl) return;

    const mine = getRequests()
        .filter(r => r.senderEmail === user.email)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    if (mine.length === 0) { containerEl.innerHTML = '<p class="empty-text">You haven\'t sent any requests yet.</p>'; return; }
    containerEl.innerHTML = mine.map(r => buildSentCard(r)).join('');
}

function buildSentCard(r) {
    const canCancel   = [RS.PENDING, RS.NEGOTIATING, RS.ACCEPTED].includes(r.status);
    const canPay      = r.status === RS.ACCEPTED;
    const canPayFinal = r.status === RS.COMPLETED;
    const canRate     = r.status === RS.FINAL_PAYMENT;
    const canReview   = r.status === RS.NEGOTIATING;

    const agreed     = Number(r.agreedAmount || 0);
    const advanceAmt = Math.round(agreed * 0.2);
    const finalAmt   = agreed - (r.advanceAmount || advanceAmt);

    const negotiationHtml = r.negotiation.length
        ? `<div class="req-neg-thread">${r.negotiation.map(n => `
            <div class="neg-entry ${n.by === r.senderEmail ? 'neg-mine' : 'neg-theirs'}">
                <span class="neg-who">${n.byName}</span>
                <span class="neg-amount">Rs. ${Number(n.amount).toLocaleString()}</span>
                ${n.note ? `<span class="neg-note">${n.note}</span>` : ''}
                <span class="neg-time">${new Date(n.at).toLocaleDateString()}</span>
            </div>`).join('')}
        </div>` : '';

    return `
    <div class="req-card" id="rc-${r.id}">
        <div class="req-card-head">
            <div>
                <span class="req-card-title">${r.title}</span>
                <span class="req-card-type">${r.serviceType === 'design' ? '🏛️ Design' : '🔧 Maintenance'}</span>
            </div>
            ${statusBadge(r.status)}
        </div>
        <div class="req-card-meta">
            <span>📍 ${r.location || '—'}</span>
            <span>💰 Rs.${Number(r.budget?.min||0).toLocaleString()} – Rs.${Number(r.budget?.max||0).toLocaleString()}</span>
            <span>🕐 ${r.timeline || '—'}</span>
            ${r.targetName ? `<span>→ ${r.targetName}</span>` : '<span>→ Open to all</span>'}
        </div>

        ${r.agreedAmount ? `
        <div class="req-payment-summary">
            <div class="pay-sum-row"><span>Agreed Total</span><strong>Rs. ${agreed.toLocaleString()}</strong></div>
            <div class="pay-sum-row">
                <span>Advance (20%)</span>
                <strong class="${r.advancePaid ? 'pay-done' : ''}">Rs. ${advanceAmt.toLocaleString()}${r.advancePaid ? ' ✓ Paid' : ''}</strong>
            </div>
            <div class="pay-sum-row">
                <span>Remaining (80%)</span>
                <strong class="${r.finalPaid ? 'pay-done' : ''}">Rs. ${finalAmt.toLocaleString()}${r.finalPaid ? ' ✓ Paid' : ''}</strong>
            </div>
        </div>` : ''}

        ${r.refundAmount ? `<div class="req-refund">↩️ Refund issued: <strong>Rs. ${Number(r.refundAmount).toLocaleString()}</strong></div>` : ''}
        ${r.cancelNote   ? `<div class="req-cancel-note">ℹ️ ${r.cancelNote}</div>` : ''}
        ${negotiationHtml}

        ${canReview ? `
        <div class="req-counter-form" id="ccf-${r.id}">
            <input type="number" class="req-input" id="cc-amt-${r.id}"
                   placeholder="Your counter offer (Rs.)"
                   value="${r.negotiation.length ? r.negotiation[r.negotiation.length-1].amount : ''}">
            <input type="text" class="req-input" id="cc-note-${r.id}" placeholder="Note (optional)">
            <div class="req-card-actions">
                <button class="req-btn req-btn-primary" onclick="clientCounter('${r.id}')">Send Counter</button>
                <button class="req-btn req-btn-success" onclick="clientAcceptOffer('${r.id}')">Accept Offer</button>
            </div>
        </div>` : ''}

        ${canPay ? `
        <div class="req-pay-section">
            <div class="req-pay-info">
                <span>Pay <strong>20% advance</strong> to begin work</span>
                <strong class="req-pay-amount">Rs. ${advanceAmt.toLocaleString()}</strong>
            </div>
            <button class="req-btn req-btn-success" onclick="openPayModal('${r.id}', 'advance')">💳 Pay Advance Now</button>
        </div>` : ''}

        ${canPayFinal ? `
        <div class="req-pay-section req-pay-final">
            <div class="req-pay-info">
                <span>Work completed! Pay the <strong>remaining 80%</strong> to close the project</span>
                <strong class="req-pay-amount">Rs. ${finalAmt.toLocaleString()}</strong>
            </div>
            <button class="req-btn req-btn-success" onclick="openPayModal('${r.id}', 'final')">💳 Pay Final Amount</button>
        </div>` : ''}

        ${canRate ? `
        <div class="req-rate-section">
            <p style="font-size:12px;color:var(--muted);margin-bottom:8px;">
                ✅ Fully paid! Please rate ${r.targetName || 'the professional'}.
            </p>
            <div class="star-row" id="stars-${r.id}">
                ${[1,2,3,4,5].map(n => `<span class="star" data-val="${n}" onclick="setRating('${r.id}',${n})">★</span>`).join('')}
            </div>
            <textarea class="req-input" id="review-${r.id}" rows="2" placeholder="Leave a review (optional)"></textarea>
            <button class="req-btn req-btn-primary" onclick="submitRating('${r.id}')">Submit Rating</button>
        </div>` : ''}

        <div class="req-card-actions">
            ${canCancel ? `<button class="req-btn req-btn-danger" onclick="cancelRequest('${r.id}','client')">Cancel Request</button>` : ''}
            ${r.status === RS.IN_PROGRESS ? `<button class="req-btn req-btn-danger" onclick="cancelRequest('${r.id}','client')">Cancel &amp; Request Refund</button>` : ''}
        </div>
        <div class="req-card-date">Posted ${new Date(r.createdAt).toLocaleDateString()}</div>
    </div>`;
}

// ── INCOMING REQUESTS ──
function renderIncomingRequests(containerEl) {
    const user = getCurrentUser();
    if (!user || !containerEl) return;

    const incoming = getRequests()
        .filter(r => {
            if (r.status === RS.CANCELLED && r.cancelledBy === 'system' && r.senderEmail !== user.email) return false;
            if (r.targetEmail) return r.targetEmail === user.email;
            if (r.serviceType === 'maintenance' && user.role === 'maintenance') return true;
            if (r.serviceType === 'design' && (user.role === 'designer' || user.role === 'architect')) return true;
            return false;
        })
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    if (incoming.length === 0) { containerEl.innerHTML = '<p class="empty-text">No incoming requests.</p>'; return; }
    containerEl.innerHTML = incoming.map(r => buildIncomingCard(r, user)).join('');
}

function buildIncomingCard(r, user) {
    const canAct      = r.status === RS.PENDING;
    const canCounter  = [RS.PENDING, RS.NEGOTIATING].includes(r.status);
    const canMarkDone = r.status === RS.IN_PROGRESS || r.status === RS.ADVANCE_PAID;

    const negotiationHtml = r.negotiation.length
        ? `<div class="req-neg-thread">${r.negotiation.map(n => `
            <div class="neg-entry ${n.by === user.email ? 'neg-mine' : 'neg-theirs'}">
                <span class="neg-who">${n.byName}</span>
                <span class="neg-amount">Rs. ${Number(n.amount).toLocaleString()}</span>
                ${n.note ? `<span class="neg-note">${n.note}</span>` : ''}
                <span class="neg-time">${new Date(n.at).toLocaleDateString()}</span>
            </div>`).join('')}
        </div>` : '';

    return `
    <div class="req-card req-card-incoming" id="rc-${r.id}">
        <div class="req-card-head">
            <div>
                <span class="req-card-title">${r.title}</span>
                <span class="req-card-type">${r.serviceType === 'design' ? '🏛️ Design' : '🔧 Maintenance'}</span>
            </div>
            ${statusBadge(r.status)}
        </div>
        <div class="req-card-meta">
            <span>👤 ${r.senderName}</span>
            <span>📍 ${r.location || '—'}</span>
            <span>💰 Rs.${Number(r.budget?.min||0).toLocaleString()} – Rs.${Number(r.budget?.max||0).toLocaleString()}</span>
            <span>🕐 ${r.timeline || '—'}</span>
        </div>
        ${r.details ? `<p class="req-details-text">${r.details}</p>` : ''}
        ${r.agreedAmount ? `
        <div class="req-payment-summary">
            <div class="pay-sum-row"><span>Agreed Total</span><strong>Rs. ${Number(r.agreedAmount).toLocaleString()}</strong></div>
            <div class="pay-sum-row">
                <span>Advance (20%)</span>
                <strong class="${r.advancePaid ? 'pay-done' : ''}">
                    Rs. ${Math.round(Number(r.agreedAmount)*0.2).toLocaleString()}
                    ${r.advancePaid ? ' ✓ Received' : ' — Pending'}
                </strong>
            </div>
            <div class="pay-sum-row">
                <span>Final (80%)</span>
                <strong class="${r.finalPaid ? 'pay-done' : ''}">
                    Rs. ${(Number(r.agreedAmount) - (r.advanceAmount || Math.round(Number(r.agreedAmount)*0.2))).toLocaleString()}
                    ${r.finalPaid ? ' ✓ Received' : r.status === RS.COMPLETED ? ' — Client Notified' : ' — Pending'}
                </strong>
            </div>
        </div>` : ''}
        ${r.status === RS.COMPLETED ? `
        <div class="req-awaiting-note">
            ⏳ Waiting for client to pay the final 80% (Rs. ${(Number(r.agreedAmount) - (r.advanceAmount || Math.round(Number(r.agreedAmount)*0.2))).toLocaleString()})
        </div>` : ''}
        ${r.status === RS.FINAL_PAYMENT ? `
        <div class="req-agreed">✅ Final payment received — Rs. ${Number(r.finalAmount||0).toLocaleString()}. Awaiting client rating.</div>` : ''}
        ${r.status === RS.RATED ? `
        <div class="req-agreed">⭐ Project closed. Client rated: ${'★'.repeat(r.clientRating||0)} ${r.clientRating}/5
            ${r.clientReview ? `<br><em style="font-size:11px;color:var(--muted);">"${r.clientReview}"</em>` : ''}
        </div>` : ''}
        ${negotiationHtml}

        ${canCounter ? `
        <div class="req-counter-form">
            <input type="number" class="req-input" id="pro-amt-${r.id}" placeholder="Your offer / counter offer (Rs.)">
            <input type="text"   class="req-input" id="pro-note-${r.id}" placeholder="Note (optional)">
            <div class="req-card-actions">
                ${canAct ? `<button class="req-btn req-btn-danger" onclick="proReject('${r.id}')">Reject</button>` : ''}
                <button class="req-btn req-btn-primary" onclick="proCounter('${r.id}')">Send Offer / Counter</button>
                ${r.negotiation.length > 0 ? `<button class="req-btn req-btn-success" onclick="proAccept('${r.id}')">Accept &amp; Confirm</button>` : ''}
            </div>
        </div>` : ''}

        ${canMarkDone ? `
        <div class="req-card-actions">
            <button class="req-btn req-btn-success" onclick="markCompleted('${r.id}')">✅ Mark as Completed</button>
            <button class="req-btn req-btn-danger"  onclick="cancelRequest('${r.id}','pro')">Cancel Project</button>
        </div>` : ''}

        <div class="req-card-date">Received ${new Date(r.createdAt).toLocaleDateString()}</div>
    </div>`;
}

// ── NEGOTIATION ACTIONS ──
function proCounter(reqId) {
    const user = getCurrentUser();
    const amt  = parseFloat(document.getElementById(`pro-amt-${reqId}`)?.value);
    const note = document.getElementById(`pro-note-${reqId}`)?.value.trim() || '';
    if (!amt || amt <= 0) return showToast('Enter a valid offer amount.', 'warn');
    const req = getRequestById(reqId);
    if (!req) return;
    patchRequest(reqId, {
        status:      RS.NEGOTIATING,
        negotiation: [...req.negotiation, { by: user.email, byName: user.username, amount: amt, note, at: new Date().toISOString() }],
    });
    showToast('Offer sent to client.');
    refreshDashboard();
}

function proAccept(reqId) {
    const req = getRequestById(reqId);
    if (!req) return;
    const lastOffer = req.negotiation[req.negotiation.length - 1];
    patchRequest(reqId, { status: RS.ACCEPTED, agreedAmount: lastOffer.amount });

    // Auto-close duplicate open requests for the same job
    getRequests().forEach(r => {
        if (
            r.id !== reqId &&
            r.senderEmail === req.senderEmail &&
            r.title       === req.title &&
            r.serviceType === req.serviceType &&
            [RS.PENDING, RS.NEGOTIATING].includes(r.status)
        ) {
            patchRequest(r.id, {
                status:      RS.CANCELLED,
                cancelledBy: 'system',
                cancelNote:  'Auto-closed — another professional accepted this request.',
                cancelledAt: new Date().toISOString(),
            });
        }
    });

    showToast('Request accepted! Awaiting client advance payment.');
    refreshDashboard();
}

function proReject(reqId) {
    if (!confirm('Reject this request?')) return;
    patchRequest(reqId, { status: RS.REJECTED });
    showToast('Request rejected.');
    refreshDashboard();
}

function clientCounter(reqId) {
    const user = getCurrentUser();
    const amt  = parseFloat(document.getElementById(`cc-amt-${reqId}`)?.value);
    const note = document.getElementById(`cc-note-${reqId}`)?.value.trim() || '';
    if (!amt || amt <= 0) return showToast('Enter a valid counter amount.', 'warn');
    const req = getRequestById(reqId);
    if (!req) return;
    patchRequest(reqId, {
        status:      RS.NEGOTIATING,
        negotiation: [...req.negotiation, { by: user.email, byName: user.username, amount: amt, note, at: new Date().toISOString() }],
    });
    showToast('Counter offer sent.');
    refreshDashboard();
}

function clientAcceptOffer(reqId) {
    const req = getRequestById(reqId);
    if (!req || !req.negotiation.length) return showToast('No offer to accept yet.', 'warn');
    const lastOffer = req.negotiation[req.negotiation.length - 1];
    patchRequest(reqId, { status: RS.ACCEPTED, agreedAmount: lastOffer.amount });
    showToast('Offer accepted! Please pay the 20% advance to begin work.');
    refreshDashboard();
}

// ── PAYMENT MODAL ──
function openPayModal(reqId, type) {
    const req = getRequestById(reqId);
    if (!req) return;

    const agreed     = Number(req.agreedAmount || 0);
    const advanceAmt = Math.round(agreed * 0.2);
    const finalAmt   = agreed - (req.advanceAmount || advanceAmt);
    const isFinal    = type === 'final';
    const payAmt     = isFinal ? finalAmt : advanceAmt;
    const payLabel   = isFinal ? 'Final Payment (80%)' : 'Advance Payment (20%)';

    const payInfo = getDB().find(u => u.email === req.targetEmail)?.payment;
    let payDetails = '<p style="color:var(--muted);font-size:12px;">No payment details on file for this professional.</p>';
    if (payInfo) {
        if (payInfo.method === 'bank') {
            payDetails = `
                <div class="pay-detail-row"><span>Bank</span><strong>${payInfo.bankName || '—'}</strong></div>
                <div class="pay-detail-row"><span>Account Holder</span><strong>${payInfo.accHolder || '—'}</strong></div>
                <div class="pay-detail-row"><span>Account No.</span><strong>${payInfo.accNumber || '—'}</strong></div>
                <div class="pay-detail-row"><span>IFSC</span><strong>${payInfo.ifsc || '—'}</strong></div>`;
        } else if (payInfo.method === 'upi') {
            payDetails = `
                <div class="pay-detail-row"><span>UPI ID</span><strong>${payInfo.upiId || '—'}</strong></div>
                <div class="pay-detail-row"><span>Name</span><strong>${payInfo.upiName || '—'}</strong></div>`;
        } else if (payInfo.method === 'wallet') {
            payDetails = `
                <div class="pay-detail-row"><span>Wallet</span><strong>${payInfo.walletType || '—'}</strong></div>
                <div class="pay-detail-row"><span>Handle</span><strong>${payInfo.walletHandle || '—'}</strong></div>`;
        }
    }

    let modal = document.getElementById('payWorkflowModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'payWorkflowModal';
        modal.className = 'modal-overlay';
        document.body.appendChild(modal);
        modal.addEventListener('click', e => { if (e.target === modal) closePayModal(); });
    }

    modal.innerHTML = `
        <div class="modal-box pay-modal-box">
            <h3>💳 ${payLabel}</h3>
            <p class="pay-modal-sub">
                Transfer <strong>Rs. ${payAmt.toLocaleString()}</strong>
                ${isFinal
                    ? `(remaining 80% of Rs. ${agreed.toLocaleString()})`
                    : `(20% advance of Rs. ${agreed.toLocaleString()})`}
                to the professional using the details below, then confirm.
            </p>
            ${isFinal ? `
            <div class="pay-breakdown-box">
                <div class="pay-detail-row"><span>Total Agreed</span><strong>Rs. ${agreed.toLocaleString()}</strong></div>
                <div class="pay-detail-row"><span>Advance Paid</span><strong class="pay-done">Rs. ${Number(req.advanceAmount||advanceAmt).toLocaleString()} ✓</strong></div>
                <div class="pay-detail-row pay-final-row"><span>Now Due (80%)</span><strong>Rs. ${finalAmt.toLocaleString()}</strong></div>
            </div>` : ''}
            <div class="pay-details-block">${payDetails}</div>
            <div class="pay-modal-note">
                ${isFinal
                    ? '✅ Once confirmed, the project will be marked <strong>Completed</strong> and you can leave a rating.'
                    : '⚠️ Work begins only after advance is confirmed. Keep your transfer receipt.'}
            </div>
            <div class="pay-ref-row">
                <label>Transaction / Reference ID</label>
                <input type="text" id="payRefInput" class="req-input" placeholder="Enter your transaction ID">
            </div>
            <div class="modal-actions">
                <button class="req-btn req-btn-success"
                        onclick="${isFinal ? `confirmFinalPayment('${reqId}', ${finalAmt})` : `confirmAdvancePayment('${reqId}', ${advanceAmt})`}">
                    ✅ I've Paid — Confirm
                </button>
                <button class="req-btn req-btn-secondary" onclick="closePayModal()">Cancel</button>
            </div>
        </div>`;

    modal.classList.add('open');
}

const closePayModal = () => { const m = document.getElementById('payWorkflowModal'); if (m) m.classList.remove('open'); };

function confirmAdvancePayment(reqId, advanceAmt) {
    const ref = document.getElementById('payRefInput')?.value.trim();
    if (!ref) return showToast('Please enter your transaction / reference ID.', 'warn');
    patchRequest(reqId, { status: RS.IN_PROGRESS, advancePaid: true, advanceAmount: advanceAmt, paymentRef: ref });
    closePayModal();
    showToast('Advance confirmed! Work is now in progress.');
    refreshDashboard();
}

function confirmFinalPayment(reqId, finalAmt) {
    const ref = document.getElementById('payRefInput')?.value.trim();
    if (!ref) return showToast('Please enter your transaction / reference ID.', 'warn');
    patchRequest(reqId, {
        status: RS.FINAL_PAYMENT, finalPaid: true, finalAmount: finalAmt,
        finalPayRef: ref, finalPaidAt: new Date().toISOString(),
    });
    closePayModal();
    showToast('Final payment confirmed! Please rate the professional.');
    refreshDashboard();
}

// ── COMPLETION & CANCELLATION ──
function markCompleted(reqId) {
    if (!confirm('Mark this project as completed?\nThe client will be asked to pay the remaining 80% and then rate your work.')) return;
    patchRequest(reqId, { status: RS.COMPLETED });
    showToast('Project marked as completed. Awaiting client\'s final payment.');
    refreshDashboard();
}

function cancelRequest(reqId, by) {
    const req = getRequestById(reqId);
    if (!req) return;
    const msg = req.advancePaid
        ? 'Cancel this project? A refund of the advance will be processed.'
        : 'Cancel this request?';
    if (!confirm(msg)) return;

    let refundAmount = null;
    if (req.advancePaid) {
        refundAmount = req.status === RS.IN_PROGRESS
            ? Math.round(req.advanceAmount * 0.5)
            : req.advanceAmount;
    }

    patchRequest(reqId, {
        status:      refundAmount ? RS.REFUNDED : RS.CANCELLED,
        cancelledBy: by,
        refundAmount,
        cancelledAt: new Date().toISOString(),
    });

    showToast(refundAmount
        ? `Request cancelled. Refund of Rs. ${refundAmount.toLocaleString()} will be processed.`
        : 'Request cancelled.');
    refreshDashboard();
}

// ── RATING ──
let _selectedRating = 0;

function setRating(reqId, val) {
    _selectedRating = val;
    document.querySelectorAll(`#stars-${reqId} .star`).forEach((s, i) => s.classList.toggle('star-filled', i < val));
}

function submitRating(reqId) {
    if (_selectedRating === 0) return showToast('Please select a star rating.', 'warn');
    const req = getRequestById(reqId);
    if (!req) return;
    if (req.status !== RS.FINAL_PAYMENT) return showToast('Please complete the final payment first.', 'warn');

    const review = document.getElementById(`review-${reqId}`)?.value.trim() || '';
    const db     = getDB();
    const proIdx = db.findIndex(u => u.email === req.targetEmail);
    if (proIdx !== -1) {
        if (!db[proIdx].ratings) db[proIdx].ratings = [];
        db[proIdx].ratings.push({ fromEmail: req.senderEmail, fromName: req.senderName, reqId, rating: _selectedRating, review, at: new Date().toISOString() });
        const avg = db[proIdx].ratings.reduce((s, r) => s + r.rating, 0) / db[proIdx].ratings.length;
        db[proIdx].avgRating   = Math.round(avg * 10) / 10;
        db[proIdx].ratingCount = db[proIdx].ratings.length;
        saveDB(db);
        const cu = getCurrentUser();
        if (cu && cu.email === req.targetEmail) setCurrentUser(db[proIdx]);
    }

    patchRequest(reqId, { status: RS.RATED, clientRating: _selectedRating, clientReview: review });
    _selectedRating = 0;
    showToast('Thank you for your rating! Project is now fully closed.');
    refreshDashboard();
}

// ── DASHBOARD REFRESH ──
function refreshDashboard() {
    const sentEl     = document.getElementById('sentRequestsBody');
    const incomingEl = document.getElementById('incomingRequestsBody');
    if (sentEl)     renderSentRequests(sentEl);
    if (incomingEl) renderIncomingRequests(incomingEl);
}

// ── TOAST ──
function showToast(msg, type = 'success') {
    let toast = document.getElementById('amToast');
    if (!toast) { toast = document.createElement('div'); toast.id = 'amToast'; document.body.appendChild(toast); }
    toast.textContent = msg;
    toast.className   = `am-toast am-toast-${type} am-toast-show`;
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('am-toast-show'), 3200);
}

// ── SAVED / ARCHIVE ──
const getSaved = () => { try { return JSON.parse(localStorage.getItem(SAVED_KEY) || '{}'); } catch { return {}; } };
const setSaved = obj => localStorage.setItem(SAVED_KEY, JSON.stringify(obj));

function toggleSaved(btn, item) {
    const saved   = getSaved();
    const isSaved = !!saved[item.id];

    if (isSaved) {
        delete saved[item.id];
        btn.classList.remove('saved');
    } else {
        saved[item.id] = { ...item, savedAt: new Date().toISOString() };
        btn.classList.add('saved');
        btn.style.transform = 'scale(1.35)';
        setTimeout(() => { btn.style.transform = ''; }, 220);
    }

    setSaved(saved);
    renderArchive();
}

function renderArchive() {
    const grid  = document.getElementById('archive-grid');
    const empty = document.getElementById('archive-empty');
    if (!grid) return;

    const items = Object.values(getSaved()).sort((a, b) => new Date(b.savedAt || 0) - new Date(a.savedAt || 0));

    if (items.length === 0) {
        grid.innerHTML = '';
        if (empty) empty.style.display = 'block';
        return;
    }

    if (empty) empty.style.display = 'none';

    grid.innerHTML = items.map(item => `
        <div class="option-card" id="saved-${item.id}">
            <div class="card-img-wrap" onclick="openLightbox(${JSON.stringify(item).replace(/"/g, '&quot;')})">
                <img src="${item.img}" alt="${item.title}" loading="lazy">
                <button class="card-heart saved"
                        aria-label="Remove from saved"
                        onclick="event.stopPropagation(); removeSaved('${item.id}')">
                    <svg viewBox="0 0 24 24">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                    </svg>
                </button>
            </div>
            <div class="card-body">
                <div class="card-title">${item.title}</div>
                <div class="card-desc">${item.desc || ''}</div>
                ${item.budget ? `<div class="card-budget"><span class="budget-label">Budget</span>${item.budget}</div>` : ''}
                <div class="card-divider"></div>
                <div class="card-designer">
                    <span class="designer-dot"></span>
                    <a href="${item.designerUrl || '#'}" target="_blank">${item.designer || 'ArchMind'}</a>
                    <button class="card-hire-btn"
                            onclick="event.stopPropagation(); removeSaved('${item.id}')"
                            style="margin-left:auto;background:rgba(229,85,85,0.1);border-color:rgba(229,85,85,0.3);color:#f87171;">
                        ✕ Remove
                    </button>
                </div>
            </div>
        </div>`
    ).join('');

    syncHeartStates();
}

function removeSaved(id) {
    const saved = getSaved();
    delete saved[id];
    setSaved(saved);
    document.querySelectorAll(`.card-heart[data-id="${id}"]`).forEach(btn => btn.classList.remove('saved'));
    renderArchive();
}

function syncHeartStates() {
    const saved = getSaved();
    document.querySelectorAll('.card-heart[data-id]').forEach(btn => {
        btn.classList.toggle('saved', !!saved[btn.getAttribute('data-id')]);
    });
}