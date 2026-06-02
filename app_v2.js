console.log("app_v2.js loaded");

const SUPABASE_URL = 'https://tuypdjmvmhccofqjbkss.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR1eXBkam12bWhjY29mcWpia3NzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MTE0MzgsImV4cCI6MjA5NTk4NzQzOH0.BnbQHqoBX0TRRTHeIT55rprmSmijwWKcqLV4AHHmnZU';

// ── 1. Init Supabase ──────────────────────────────────────────────────────────
// Guard: Supabase CDN must be loaded before this script runs.
// Both <script> tags are at bottom of <body>, so this is safe.
let supabase;
if (window.supabase) {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log("Supabase client created OK");
} else {
    console.error("Supabase CDN not loaded! Check the CDN <script> tag above app_v2.js.");
}

// ── 2. Auth check ─────────────────────────────────────────────────────────────
async function checkAuth() {
    if (!supabase) return;
    try {
        const { data: { session } } = await supabase.auth.getSession();
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        console.log("Auth check | page:", currentPage, "| session:", !!session);

        if (session) {
            // Logged in but on login page → go to form
            if (currentPage === 'index.html' || currentPage === '') {
                window.location.href = 'form.html';
            }
        } else {
            // Not logged in but on form page → go to login
            if (currentPage === 'form.html') {
                window.location.href = 'index.html';
            }
        }
    } catch (err) {
        console.error("Auth check failed:", err);
    }
}

// ── 3. Wire up UI after DOM is ready ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {
    console.log("DOM ready, wiring up UI...");

    // Run auth check now that DOM is ready
    checkAuth();

    // ── Login form ────────────────────────────────────────────────────────────
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email    = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const errorDiv = document.getElementById('loginError');
            const btn      = loginForm.querySelector('button');

            btn.textContent = 'Logging in...';
            btn.disabled    = true;
            errorDiv.textContent = '';

            try {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) {
                    errorDiv.textContent = error.message;
                } else {
                    window.location.href = 'form.html';
                }
            } catch (err) {
                errorDiv.textContent = "Error: " + err.message;
            } finally {
                btn.textContent = 'Login';
                btn.disabled    = false;
            }
        });
    }

    // ── Logout button ─────────────────────────────────────────────────────────
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await supabase.auth.signOut();
            window.location.href = 'index.html';
        });
    }

    // ── Submit button ─────────────────────────────────────────────────────────
    const submitBtn  = document.getElementById('submitBtn');
    const messageDiv = document.getElementById('formMessage');

    if (!submitBtn) {
        console.error("submitBtn not found in DOM!");
        return;
    }
    console.log("submitBtn found, attaching click listener.");

    submitBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        console.log("Submit clicked");

        // Clear previous message
        messageDiv.textContent = '';
        messageDiv.className   = 'message';

        // ── Validate text / select / file fields ──────────────────────────────
        const requiredIds = [
            'ContentPlaceHolder1_ddlBank',
            'ContentPlaceHolder1_txtATMID',
            'ContentPlaceHolder1_txt_atmplace',
            'txtActualDateTime',
            'fromtime',
            'txt_todate',
            'txt_totime',
            'txt_ack_fir_no',
            'ContentPlaceHolder1_uploadnotice'
        ];

        for (const id of requiredIds) {
            const el = document.getElementById(id);
            if (!el) { console.warn("Field not found:", id); continue; }

            const isEmpty = el.files
                ? el.files.length === 0          // file input
                : !el.value.trim();              // text / select

            if (isEmpty) {
                messageDiv.textContent = `Please fill out all required fields. (Missing: ${id})`;
                messageDiv.className   = 'message error';
                console.warn("Validation failed on:", id);
                return;
            }
        }

        // ── Validate checkboxes ───────────────────────────────────────────────
        const checkedBoxes = document.querySelectorAll('input[name="camera_footage"]:checked');
        if (checkedBoxes.length === 0) {
            messageDiv.textContent = "Please select at least one Camera Footage option.";
            messageDiv.className   = 'message error';
            return;
        }

        // ── All good – disable button and submit ──────────────────────────────
        submitBtn.textContent = 'Submitting...';
        submitBtn.disabled    = true;

        try {
            // Upload file to Supabase Storage
            let fileUrl = null;
            const fileInput = document.getElementById('ContentPlaceHolder1_uploadnotice');

            if (fileInput.files.length > 0) {
                const file     = fileInput.files[0];
                const fileExt  = file.name.split('.').pop();
                const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
                const filePath = `notices/${Date.now()}_${safeName}`;

                console.log("Uploading file:", filePath);
                const { error: uploadError } = await supabase.storage
                    .from('documents')
                    .upload(filePath, file);

                if (uploadError) throw new Error('File upload failed: ' + uploadError.message);

                const { data: { publicUrl } } = supabase.storage
                    .from('documents')
                    .getPublicUrl(filePath);

                fileUrl = publicUrl;
                console.log("File uploaded:", fileUrl);
            }

            // Build form payload
            const formData = {
                bank_name:            document.getElementById('ContentPlaceHolder1_ddlBank').value,
                atm_id:               document.getElementById('ContentPlaceHolder1_txtATMID').value,
                address:              document.getElementById('ContentPlaceHolder1_txt_atmplace').value,
                date_from:            document.getElementById('txtActualDateTime').value,
                time_from:            document.getElementById('fromtime').value,
                date_to:              document.getElementById('txt_todate').value,
                time_to:              document.getElementById('txt_totime').value,
                ack_no:               document.getElementById('txt_ack_fir_no').value,
                camera_footage_for:   Array.from(checkedBoxes).map(cb => cb.value).join(', '),
                remarks:              document.getElementById('ContentPlaceHolder1_txt_remark').value,
                notice_file_url:      fileUrl
            };

            console.log("Inserting into cctv_requests:", formData);
            const { error: insertError } = await supabase
                .from('cctv_requests')
                .insert([formData]);

            if (insertError) throw insertError;

            // ── Success ───────────────────────────────────────────────────────
            messageDiv.textContent = 'Request submitted successfully!';
            messageDiv.className   = 'message success';
            console.log("Submission successful!");

            // Reset form
            document.querySelectorAll('#cctvForm input, #cctvForm textarea, #cctvForm select').forEach(el => {
                if (el.type === 'checkbox' || el.type === 'radio') el.checked = false;
                else el.value = '';
            });

        } catch (err) {
            console.error("Submission error:", err);
            messageDiv.textContent = err.message;
            messageDiv.className   = 'message error';
        } finally {
            submitBtn.textContent = 'Submit Request';
            submitBtn.disabled    = false;
        }
    });

    // ── Custom multi-select dropdown ──────────────────────────────────────────
    const cameraDropdown = document.getElementById('cameraSelectedText');
    const cameraItems    = document.getElementById('ContentPlaceHolder1_lstCameraFootageForatm');

    if (cameraDropdown && cameraItems) {
        cameraDropdown.addEventListener('click', function (e) {
            e.stopPropagation();
            cameraItems.classList.toggle('select-hide');
        });

        const checkboxes = cameraItems.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(cb => {
            cb.addEventListener('change', () => {
                const checked = Array.from(checkboxes).filter(c => c.checked).map(c => c.value);
                cameraDropdown.textContent = checked.length ? checked.join(', ') : 'Select options...';
            });
        });

        document.addEventListener('click', () => cameraItems.classList.add('select-hide'));
        cameraItems.addEventListener('click', e => e.stopPropagation());
    }

    // ── Date auto-mask (DD/MM/YYYY) ───────────────────────────────────────────
    function maskDate(e) {
        if (e.inputType === 'deleteContentBackward') return;
        let v = e.target.value.replace(/\D/g, '');
        if (v.length > 8) v = v.substring(0, 8);
        if (v.length >= 5)      e.target.value = `${v.slice(0,2)}/${v.slice(2,4)}/${v.slice(4,8)}`;
        else if (v.length >= 3) e.target.value = `${v.slice(0,2)}/${v.slice(2,4)}`;
        else                    e.target.value = v;
    }
    ['txtActualDateTime', 'txt_todate'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', maskDate);
    });

    // ── Time auto-mask (HH:MM AM/PM) ─────────────────────────────────────────
    function maskTime(e) {
        if (e.inputType === 'deleteContentBackward') return;
        let v       = e.target.value.toUpperCase();
        let chars   = v.replace(/[^0-9APM]/g, '');
        let digits  = chars.replace(/\D/g, '').substring(0, 4);
        let letters = chars.replace(/[^APM]/g, '').substring(0, 2);
        let out     = digits.length >= 3 ? `${digits.slice(0,2)}:${digits.slice(2,4)}` : digits;
        if (digits.length === 4) {
            if (letters.startsWith('A')) out += ' AM';
            else if (letters.startsWith('P')) out += ' PM';
        }
        e.target.value = out;
    }
    ['fromtime', 'txt_totime'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', maskTime);
    });

}); // end DOMContentLoaded
