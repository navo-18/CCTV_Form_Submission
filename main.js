console.log("main.js loaded");

const SUPABASE_URL = 'https://tuypdjmvmhccofqjbkss.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR1eXBkam12bWhjY29mcWpia3NzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MTE0MzgsImV4cCI6MjA5NTk4NzQzOH0.BnbQHqoBX0TRRTHeIT55rprmSmijwWKcqLV4AHHmnZU';

let supabase;
try {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} catch (e) {
    alert("Supabase Error: " + e.message);
}

async function checkAuth() {
    if (!supabase) return;
    try {
        const { data: { session } } = await supabase.auth.getSession();
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        
        if (session) {
            if (currentPage === 'index.html') {
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
// Run immediately instead of waiting for DOMContentLoaded just in case
checkAuth();

const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const errorDiv = document.getElementById('loginError');
        const submitBtn = loginForm.querySelector('button');

        submitBtn.textContent = 'Logging in...';
        submitBtn.disabled = true;
        errorDiv.textContent = '';

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password,
            });

            if (error) {
                errorDiv.textContent = error.message;
                submitBtn.textContent = 'Login';
                submitBtn.disabled = false;
            } else {
                window.location.href = 'form.html';
            }
        } catch (err) {
            errorDiv.textContent = "Error: " + err.message;
            submitBtn.textContent = 'Login';
            submitBtn.disabled = false;
        }
    });
}

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
            const checkedBoxes = document.querySelectorAll('input[name="camera_footage"]:checked');
            if (checkedBoxes.length === 0) {
                throw new Error("Please select at least one Camera Footage option.");
            }
            
            let fileUrl = null;

            const fileInput = document.getElementById('ContentPlaceHolder1_uploadnotice');
            
            if (fileInput.files.length > 0) {
                const file = fileInput.files[0];
                const fileExt = file.name.split('.').pop();
                const fileName = `${Math.random()}.${fileExt}`;
                const filePath = `notices/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('documents')
                    .upload(filePath, file);

                if (uploadError) throw new Error('File upload failed: ' + uploadError.message);

                const { data: { publicUrl } } = supabase.storage
                    .from('documents')
                    .getPublicUrl(filePath);
                
                fileUrl = publicUrl;
            }

            const formData = {
                bank_name: document.getElementById('ContentPlaceHolder1_ddlBank').value,
                atm_id: document.getElementById('ContentPlaceHolder1_txtATMID').value,
                address: document.getElementById('ContentPlaceHolder1_txt_atmplace').value,
                date_from: document.getElementById('txtActualDateTime').value,
                time_from: document.getElementById('fromtime').value,
                date_to: document.getElementById('txt_todate').value,
                time_to: document.getElementById('txt_totime').value,
                ack_no: document.getElementById('txt_ack_fir_no').value,
                camera_footage_for: Array.from(document.querySelectorAll('input[name="camera_footage"]:checked')).map(cb => cb.value).join(', '),
                remarks: document.getElementById('ContentPlaceHolder1_txt_remark').value,
                notice_file_url: fileUrl
            };

            const { error: insertError } = await supabase
                .from('cctv_requests')
                .insert([formData]);

            if (insertError) throw insertError;

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

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await supabase.auth.signOut();
            window.location.href = 'index.html';
        });
    }
}


// --- Custom Dropdown Logic ---
const cameraDropdown = document.getElementById('cameraSelectedText');
const cameraItems = document.getElementById('ContentPlaceHolder1_lstCameraFootageForatm');
if (cameraDropdown && cameraItems) {
    cameraDropdown.addEventListener('click', function(e) {
        e.stopPropagation();
        cameraItems.classList.toggle('select-hide');
    });
    
    const checkboxes = cameraItems.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(cb => {
        cb.addEventListener('change', () => {
            const checked = Array.from(checkboxes).filter(c => c.checked).map(c => c.value);
            if (checked.length === 0) {
                cameraDropdown.textContent = 'Select options...';
            } else {
                cameraDropdown.textContent = checked.join(', ');
            }
        });
    });

    document.addEventListener('click', function() {
        cameraItems.classList.add('select-hide');
    });
    cameraItems.addEventListener('click', function(e) {
        e.stopPropagation();
    });
}

// --- Auto-masking for Dates ---
function maskDate(e) {
    if (e.inputType === 'deleteContentBackward') return;
    let v = e.target.value.replace(/\D/g, ''); 
    if (v.length > 8) v = v.substring(0, 8); 
    if (v.length >= 5) {
        e.target.value = `${v.substring(0,2)}/${v.substring(2,4)}/${v.substring(4,8)}`;
    } else if (v.length >= 3) {
        e.target.value = `${v.substring(0,2)}/${v.substring(2,4)}`;
    } else {
        e.target.value = v;
    }
}
const dateFields = ['txtActualDateTime', 'txt_todate'];
dateFields.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', maskDate);
});

// --- Auto-masking for Times ---
function maskTime(e) {
    if (e.inputType === 'deleteContentBackward') return;
    let v = e.target.value.toUpperCase();
    let chars = v.replace(/[^0-9APM]/g, '');
    let digits = chars.replace(/\D/g, '');
    let letters = chars.replace(/[^APM]/g, '');
    
    if (digits.length > 4) digits = digits.substring(0, 4);
    if (letters.length > 2) letters = letters.substring(0, 2);
    
    let out = '';
    if (digits.length >= 3) {
        out = digits.substring(0,2) + ':' + digits.substring(2,4);
    } else {
        out = digits;
    }
    
    if (digits.length === 4) {
        if (letters.startsWith('A')) out += ' AM';
        else if (letters.startsWith('P')) out += ' PM';
    }
    e.target.value = out;
}
const timeFields = ['fromtime', 'txt_totime'];
timeFields.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', maskTime);
});
