console.log("app_v2.js loaded");

const SUPABASE_URL = 'https://tuypdjmvmhccofqjbkss.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR1eXBkam12bWhjY29mcWpia3NzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MTE0MzgsImV4cCI6MjA5NTk4NzQzOH0.BnbQHqoBX0TRRTHeIT55rprmSmijwWKcqLV4AHHmnZU';

// ── Init Supabase ─────────────────────────────────────────────────────────────
// IMPORTANT: We use "supabaseClient" (not "supabase") to avoid conflicting
// with the global window.supabase object injected by the Supabase CDN.
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

    // ── Logout button ─────────────────────────────────────────────────────────
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await supabaseClient.auth.signOut();
            window.location.href = 'index.html';
        });
    }

    // ── Camera footage multi-select dropdown ──────────────────────────────────
    const cameraSelectedText = document.getElementById('cameraSelectedText');
    const cameraOptionsList  = document.getElementById('ContentPlaceHolder1_lstCameraFootageForatm');

    if (cameraSelectedText && cameraOptionsList) {
        console.log("Camera dropdown found, wiring up...");

        cameraSelectedText.addEventListener('click', function (e) {
            e.stopPropagation();
            cameraOptionsList.classList.toggle('select-hide');
        });

        const checkboxes = cameraOptionsList.querySelectorAll('input[type="checkbox"]');
        console.log("Camera checkboxes found:", checkboxes.length);

        checkboxes.forEach(cb => {
            cb.addEventListener('change', () => {
                const checked = Array.from(checkboxes).filter(c => c.checked).map(c => c.value);
                cameraSelectedText.textContent = checked.length ? checked.join(', ') : 'Select options...';
            });
        });

        document.addEventListener('click', () => cameraOptionsList.classList.add('select-hide'));
        cameraOptionsList.addEventListener('click', e => e.stopPropagation());
    } else {
        console.warn("Camera dropdown elements not found:", {
            cameraSelectedText: !!cameraSelectedText,
            cameraOptionsList: !!cameraOptionsList
        });
    }

    // ── Date auto-mask (MM/DD/YYYY) ───────────────────────────────────────────
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
        if (el) {
            el.addEventListener('input', maskDate);
            console.log("Date mask attached to:", id);
        } else {
            console.warn("Date field not found:", id);
        }
    });

    // ── Time auto-mask (HH:MM AM/PM) ─────────────────────────────────────────
    function maskTime(e) {
        if (e.inputType === 'deleteContentBackward') return;
        const raw    = e.target.value.toUpperCase();
        const digits = raw.replace(/\D/g, '').substring(0, 4);
        const hasAM  = raw.includes('A');
        const hasPM  = raw.includes('P');
        let out = digits.length >= 3 ? `${digits.slice(0,2)}:${digits.slice(2,4)}` : digits;
        if (digits.length === 4) {
            if (hasAM)      out += ' AM';
            else if (hasPM) out += ' PM';
        }
        e.target.value = out;
    }

    ['fromtime', 'txt_totime'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', maskTime);
            console.log("Time mask attached to:", id);
        } else {
            console.warn("Time field not found:", id);
        }
    });

    // ── Submit button ─────────────────────────────────────────────────────────
    const submitBtn  = document.getElementById('submitBtn');
    const messageDiv = document.getElementById('formMessage');

    if (!submitBtn) {
        console.log("No submitBtn on this page (expected on index.html)");
        return;
    }
    console.log("submitBtn found, attaching listener.");

    submitBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        console.log("Submit clicked");

        messageDiv.textContent = '';
        messageDiv.className   = 'message';

        // Validate required fields
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

        // Validate camera footage checkboxes
        const checkedBoxes = document.querySelectorAll('input[name="camera_footage"]:checked');
        if (checkedBoxes.length === 0) {
            messageDiv.textContent = "Please select at least one Camera Footage option.";
            messageDiv.className   = 'message error';
            return;
        }

        submitBtn.textContent = 'Submitting...';
        submitBtn.disabled    = true;

        try {
            // Upload file
            let fileUrl = null;
            const fileInput = document.getElementById('ContentPlaceHolder1_uploadnotice');
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

            // Build and insert record
            const formData = {
                bank_name:          document.getElementById('ContentPlaceHolder1_ddlBank').value,
                atm_id:             document.getElementById('ContentPlaceHolder1_txtATMID').value,
                address:            document.getElementById('ContentPlaceHolder1_txt_atmplace').value,
                date_from:          document.getElementById('txtActualDateTime').value,
                time_from:          document.getElementById('fromtime').value,
                date_to:            document.getElementById('txt_todate').value,
                time_to:            document.getElementById('txt_totime').value,
                ack_no:             document.getElementById('txt_ack_fir_no').value,
                camera_footage_for: Array.from(checkedBoxes).map(cb => cb.value).join(', '),
                remarks:            document.getElementById('ContentPlaceHolder1_txt_remark').value,
                notice_file_url:    fileUrl
            };

            console.log("Inserting:", formData);
            const { error: insertError } = await supabaseClient
                .from('cctv_requests')
                .insert([formData]);
            if (insertError) throw insertError;

            messageDiv.textContent = 'Request submitted successfully!';
            messageDiv.className   = 'message success';
            console.log("Submission successful!");

            // Reset form
            document.querySelectorAll('#cctvForm input, #cctvForm textarea, #cctvForm select').forEach(el => {
                if (el.type === 'checkbox' || el.type === 'radio') el.checked = false;
                else el.value = '';
            });
            cameraSelectedText && (cameraSelectedText.textContent = 'Select options...');

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
