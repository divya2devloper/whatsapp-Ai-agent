const axios = require('axios');
const fs = require('fs');

async function testPost() {
  try {
    const FormData = require('form-data');
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
    form.append('images', '[]');

    const res = await axios.post('http://localhost:3001/api/properties', form, {
      headers: form.getHeaders()
    });
    console.log("Success:", res.data);
  } catch (err) {
    if (err.response) {
      console.error("HTTP Status:", err.response.status);
      console.error("Data:", err.response.data);
    } else {
      console.error("Error:", err.message);
    }
  }
}

testPost();
