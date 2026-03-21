const { exec } = require('child_process');
const axios = require('axios');
const path = require('path');
const FormData = require('form-data');

const backendPath = path.join(__dirname, 'backend');

// Start backend
const serverProcess = exec('node src/server.js', { cwd: backendPath }, (error, stdout, stderr) => {
    if (error) console.error("Server crashed:", error.message);
    if (stderr) console.error("Server stderr:", stderr);
});

serverProcess.stdout.on('data', async (data) => {
    console.log("Server stdout:", data.toString());
    
    if (data.includes('running on port')) {
        // Send the test request
        try {
            console.log("Sending POST request...");
            const form = new FormData();
            form.append('location', 'hi from script');
            form.append('url', 'https://foo.com');
            form.append('description', 'df');
            form.append('property_type', '2bhk');
            form.append('price_range', '100');
            form.append('owner_name', 'jiniyas');
            form.append('owner_number', '1234');
            form.append('listing_status', 'Active');
            form.append('is_active', 'true');
            form.append('existing_images', '[]');

            const res = await axios.post('http://localhost:3001/api/properties', form, {
                headers: form.getHeaders()
            });
            console.log("Success:", res.data);
            
            // Kill server properly so we can exit gracefully
            serverProcess.kill();
            process.exit(0);
        } catch (err) {
            console.error("Axios Error:", err.message);
            if (err.response) {
                console.error("HTTP Status:", err.response.status);
                console.error("Data:", err.response.data);
            }
            
            // the server might have crashed, just wait 1s
            setTimeout(() => {
                serverProcess.kill();
                process.exit(1);
            }, 1000);
        }
    }
});
