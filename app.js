// --- Supabase Configuration ---
// YOU MUST FILL THESE IN FROM YOUR SUPABASE DASHBOARD
const SUPABASE_URL = 'https://tuypdjmvmhccofqjbkss.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR1eXBkam12bWhjY29mcWpia3NzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MTE0MzgsImV4cCI6MjA5NTk4NzQzOH0.BnbQHqoBX0TRRTHeIT55rprmSmijwWKcqLV4AHHmnZU';

// Initialize Supabase Client
let supabase;
try {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} catch (e) {
    console.error("Supabase client failed to initialize. Did you add your URL and Key?", e);
}

// --- Auth State Management ---
// Check if user is logged in
async function checkAuth() {
    if (!supabase) return;
    const { data: { session } } = await supabase.auth.getSession();
    const currentPage = window.location.pathname.split('/').pop();
    
    if (session) {
        // User is logged in
        if (currentPage === 'index.html' || currentPage === '') {
            window.location.href = 'form.html';
        }
    } else {
        // User is not logged in
        if (currentPage === 'form.html') {
            window.location.href = 'index.html';
        }
    }
}

// Run auth check on page load
document.addEventListener('DOMContentLoaded', checkAuth);

// --- Login Logic (index.html) ---
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const errorDiv = document.getElementById('loginError');
        const submitBtn = loginForm.querySelector('button');

        if (SUPABASE_URL === 'YOUR_SUPABASE_PROJECT_URL') {
            errorDiv.textContent = "Please configure Supabase URL and Key in app.js first.";
            return;
        }

        submitBtn.textContent = 'Logging in...';
        submitBtn.disabled = true;
        errorDiv.textContent = '';

        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) {
            errorDiv.textContent = error.message;
            submitBtn.textContent = 'Login';
            submitBtn.disabled = false;
        } else {
            // Success, redirect happens in checkAuth, but we can force it here
            window.location.href = 'form.html';
        }
    });
}

// --- Form Logic (form.html) ---
const cctvForm = document.getElementById('cctvForm');
if (cctvForm) {
    cctvForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const messageDiv = document.getElementById('formMessage');
        const submitBtn = document.getElementById('submitBtn');
        
        submitBtn.textContent = 'Submitting...';
        submitBtn.disabled = true;
        messageDiv.textContent = '';
        messageDiv.className = 'message';

        try {
            let fileUrl = null;
            const fileInput = document.getElementById('ContentPlaceHolder1_uploadnotice');
            
            // 1. Upload File if selected
            if (fileInput.files.length > 0) {
                const file = fileInput.files[0];
                const fileExt = file.name.split('.').pop();
                const fileName = `${Math.random()}.${fileExt}`;
                const filePath = `notices/${fileName}`;

                // Make sure you create a storage bucket called 'documents' in Supabase
                const { error: uploadError } = await supabase.storage
                    .from('documents')
                    .upload(filePath, file);

                if (uploadError) {
                    throw new Error('File upload failed: ' + uploadError.message);
                }

                // Get public URL
                const { data: { publicUrl } } = supabase.storage
                    .from('documents')
                    .getPublicUrl(filePath);
                
                fileUrl = publicUrl;
            }

            // 2. Gather form data
            const formData = {
                bank_name: document.getElementById('ContentPlaceHolder1_ddlBank').value,
                atm_id: document.getElementById('ContentPlaceHolder1_txtATMID').value,
                address: document.getElementById('ContentPlaceHolder1_txt_atmplace').value,
                date_from: document.getElementById('txtActualDateTime').value,
                time_from: document.getElementById('fromtime').value,
                date_to: document.getElementById('txt_todate').value,
                time_to: document.getElementById('txt_totime').value,
                ack_no: document.getElementById('txt_ack_fir_no').value,
                camera_footage_for: document.getElementById('ContentPlaceHolder1_lstCameraFootageForatm').value,
                remarks: document.getElementById('ContentPlaceHolder1_txt_remark').value,
                notice_file_url: fileUrl
            };

            // 3. Insert into Supabase Table
            // Make sure you create a table called 'cctv_requests' in Supabase
            const { error: insertError } = await supabase
                .from('cctv_requests')
                .insert([formData]);

            if (insertError) throw insertError;

            // Success
            messageDiv.textContent = 'Request submitted successfully!';
            messageDiv.classList.add('success');
            cctvForm.reset();

        } catch (error) {
            messageDiv.textContent = error.message;
            messageDiv.classList.add('error');
        } finally {
            submitBtn.textContent = 'Submit Request';
            submitBtn.disabled = false;
        }
    });

    // Logout logic
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        await supabase.auth.signOut();
        window.location.href = 'index.html';
    });
}
