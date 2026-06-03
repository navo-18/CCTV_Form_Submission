console.log("app_v2.js loaded");

const SUPABASE_URL = 'https://tuypdjmvmhccofqjbkss.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR1eXBkam12bWhjY29mcWpia3NzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MTE0MzgsImV4cCI6MjA5NTk4NzQzOH0.BnbQHqoBX0TRRTHeIT55rprmSmijwWKcqLV4AHHmnZU';

// ── Init Supabase ─────────────────────────────────────────────────────────────
// Using "supabaseClient" to avoid conflict with window.supabase from CDN
let supabaseClient = null;
try {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log("Supabase client created OK");
} catch (e) {
    console.error("Supabase init failed:", e.message);
}

// ── Auth check ────────────────────────────────────────────────────────────────
async function checkAuth() {
    if (!supabaseClient) return;
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        console.log("Auth | page:", currentPage, "| session:", !!session);
        if (session) {
            if (currentPage === 'index.html' || currentPage === '') {
                window.location.href = 'form.html';
            }
        } else {
            if (currentPage === 'form.html') {
                window.location.href = 'index.html';
            }
        }
    } catch (err) {
        console.error("Auth check failed:", err);
    }
}

// ── Wire up everything after DOM is ready ─────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {
    console.log("DOM ready");
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
            btn.disabled = true;
            errorDiv.textContent = '';
            try {
                const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
                if (error) {
                    errorDiv.textContent = error.message;
                } else {
                    window.location.href = 'form.html';
                }
            } catch (err) {
                errorDiv.textContent = "Error: " + err.message;
            } finally {
                btn.textContent = 'Login';
                btn.disabled = false;
            }
        });
    }

    // ── Logout ────────────────────────────────────────────────────────────────
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await supabaseClient.auth.signOut();
            window.location.href = 'index.html';
        });
    }


    function formatTime(val) {
        // val = "HH:MM" (24hr) → "HH:MM AM/PM" (12hr)
        if (!val) return '';
        let [h, m] = val.split(':');
        h = parseInt(h, 10);
        const ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12 || 12;
        return `${String(h).padStart(2, '0')}:${m} ${ampm}`;
    }

    // ── Date auto-mask: type digits, slashes inserted automatically ─────────────
    // Format: MM/DD/YYYY
    function maskDate(e) {
        if (e.inputType === 'deleteContentBackward') return;
        let v = e.target.value.replace(/\D/g, '');
        if (v.length > 8) v = v.substring(0, 8);
        if (v.length >= 5)      e.target.value = v.slice(0,2) + '/' + v.slice(2,4) + '/' + v.slice(4,8);
        else if (v.length >= 3) e.target.value = v.slice(0,2) + '/' + v.slice(2,4);
        else                    e.target.value = v;
    }
    ['txtActualDateTime', 'txt_todate'].forEach(function(id) {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', maskDate);
    });

    // ── Time auto-mask: type digits + A/P, colon and AM/PM inserted automatically
    // Format: HH:MM AM/PM  e.g. type 1200P → 12:00 PM
    function maskTime(e) {
        if (e.inputType === 'deleteContentBackward') return;
        const raw    = e.target.value.toUpperCase();
        const digits = raw.replace(/\D/g, '').substring(0, 4);
        const hasAM  = raw.indexOf('A') !== -1;
        const hasPM  = raw.indexOf('P') !== -1;
        let out = digits.length >= 3
            ? digits.slice(0,2) + ':' + digits.slice(2,4)
            : digits;
        if (digits.length === 4) {
            if (hasAM)      out += ' AM';
            else if (hasPM) out += ' PM';
        }
        e.target.value = out;
    }
    ['fromtime', 'txt_totime'].forEach(function(id) {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', maskTime);
    });

    // ── Remarks character counter ─────────────────────────────────────────────
    window.updateRemarkCounter = function(el) {
        const remaining = 249 - el.value.length;
        const counter = document.getElementById('remarkCounter');
        if (counter) {
            counter.textContent = remaining;
            counter.style.color = remaining < 20 ? 'red' : '#aaa';
        }
    };

    // ── Submit button ─────────────────────────────────────────────────────────
    const submitBtn  = document.getElementById('ContentPlaceHolder1_btnsubmit');
    const messageDiv = document.getElementById('formMessage');

    if (!submitBtn) {
        console.log("No submitBtn on this page (login page).");
        return;
    }
    console.log("submitBtn found, attaching listener.");

    submitBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        console.log("Submit clicked");

        messageDiv.textContent = '';
        messageDiv.className   = 'message';

        // ── Validate required text/select/file fields ─────────────────────────
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
            const isEmpty = el.files ? el.files.length === 0 : !el.value.trim();
            if (isEmpty) {
                messageDiv.textContent = `Please fill out all required fields. (Missing: ${id})`;
                messageDiv.className   = 'message error';
                console.warn("Validation failed:", id);
                return;
            }
        }

        // ── Validate acknowledgement number is 14 digits ──────────────────────
        const ackEl = document.getElementById('txt_ack_fir_no');
        if (ackEl.value.trim().length !== 14) {
            messageDiv.textContent = "Acknowledgement number must be exactly 14 digits.";
            messageDiv.className   = 'message error';
            return;
        }

        // ── Validate camera footage multi-select ──────────────────────────────
        const cameraSelect = document.getElementById('ContentPlaceHolder1_lstCameraFootageForatm');
        const selectedCameras = Array.from(cameraSelect.selectedOptions).map(o => o.value);
        if (selectedCameras.length === 0) {
            messageDiv.textContent = "Please select at least one Camera Footage option.";
            messageDiv.className   = 'message error';
            return;
        }

        // ── All valid — submit ────────────────────────────────────────────────
        submitBtn.textContent = 'Submitting...';
        submitBtn.disabled    = true;

        try {
            // Upload file to Supabase Storage
            let fileUrl = null;
            const fileInput = document.getElementById('ContentPlaceHolder1_uploadnotice');

            // Validate file: PDF only, max 5MB
            if (fileInput.files.length > 0) {
                const f = fileInput.files[0];
                if (f.type !== 'application/pdf') {
                    throw new Error('Only PDF files are allowed.');
                }
                if (f.size > 5 * 1024 * 1024) {
                    throw new Error('File size must not exceed 5MB.');
                }
            }

            if (fileInput.files.length > 0) {
                const file     = fileInput.files[0];
                const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
                const filePath = `notices/${Date.now()}_${safeName}`;
                console.log("Uploading:", filePath);

                const { error: uploadError } = await supabaseClient.storage
                    .from('documents')
                    .upload(filePath, file);
                if (uploadError) throw new Error('File upload failed: ' + uploadError.message);

                const { data: { publicUrl } } = supabaseClient.storage
                    .from('documents')
                    .getPublicUrl(filePath);
                fileUrl = publicUrl;
                console.log("File uploaded:", fileUrl);
            }

            // Build record
            const formData = {
                bank_name:          document.getElementById('ContentPlaceHolder1_ddlBank').value,
                atm_id:             document.getElementById('ContentPlaceHolder1_txtATMID').value,
                address:            document.getElementById('ContentPlaceHolder1_txt_atmplace').value,
                date_from:          document.getElementById('txtActualDateTime').value,
                time_from:          document.getElementById('fromtime').value,
                date_to:            document.getElementById('txt_todate').value,
                time_to:            document.getElementById('txt_totime').value,
                ack_no:             ackEl.value.trim(),
                camera_footage_for: selectedCameras.map(v => v === '4' ? 'Pinhole Camera' : v === '5' ? 'ATM Room Camera' : v).join(', '),
                remarks:            document.getElementById('ContentPlaceHolder1_txt_remark').value,
                notice_file_url:    fileUrl
            };

            console.log("Inserting:", formData);
            const { error: insertError } = await supabaseClient
                .from('cctv_requests')
                .insert([formData]);
            if (insertError) throw insertError;

            // Success
            messageDiv.textContent = 'Request submitted successfully!';
            messageDiv.className   = 'message success';
            console.log("Submission successful!");

            // Reset form
            document.querySelectorAll('#cctvForm input, #cctvForm textarea, #cctvForm select').forEach(el => {
                if (el.type === 'checkbox' || el.type === 'radio') el.checked = false;
                else el.value = '';
            });
            // Deselect multi-select
            Array.from(cameraSelect.options).forEach(o => o.selected = false);

        } catch (err) {
            console.error("Submission error:", err);
            messageDiv.textContent = err.message;
            messageDiv.className   = 'message error';
        } finally {
            submitBtn.textContent = 'Submit Request';
            submitBtn.disabled    = false;
        }
    });

}); // end DOMContentLoaded
