// Initialize Supabase v2 client
const client = supabase.createClient(
  'https://lngdoqimxolarajflobo.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxuZ2RvcWlteG9sYXJhamZsb2JvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ0MjQ5MDQsImV4cCI6MjA2MDAwMDkwNH0.hDroH3E7cq-RHh8iGsbg5s1tdYVSHMI94ZSZXzoABic'
);

// On page load
document.addEventListener('DOMContentLoaded', () => {
  fetchRecipes();

  document.getElementById('recipe-form').addEventListener('submit', handleSubmit);
  document.getElementById('cancel-button').addEventListener('click', handleCancel);  // Add event listener for Cancel button
  document.getElementById('search-bar').addEventListener('input', filterRecipes);
  document.getElementById('sort-category').addEventListener('change', filterRecipes);
});

// Handle form cancel
function handleCancel() {
  const isEditing = document.getElementById('recipe-id').value;
  
  if (!isEditing) return; // Do nothing if not editing

  const confirmCancel = confirm("Cancel editing this recipe? Any unsaved changes will be lost.");
  if (!confirmCancel) return;

  // Reset form and UI
  document.getElementById('recipe-form').reset();
  document.getElementById('form-title').textContent = 'Add New Recipe';
  document.getElementById('recipe-id').value = ''; 
  document.getElementById('status').textContent = 'Edit cancelled.';

  document.getElementById('cancel-button').style.display = 'none';
}


// Handle form submit
async function handleSubmit(event) {
  event.preventDefault();

  const id = document.getElementById('recipe-id').value;
  const name = document.getElementById('name').value.trim();
  const category = document.getElementById('category').value;
  const description = document.getElementById('description').value.trim();
  const originalFile = document.getElementById('image').files[0];

  let imageUrl;

  // If an image is uploaded, handle the upload
  if (originalFile) {
    const fileExt = originalFile.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `recipes/${fileName}`;

    // Change the bucket name here to match your actual bucket name
    const { error: uploadError } = await client.storage
      .from('recipe-images') // Use your actual bucket name here
      .upload(filePath, originalFile, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      return alert('Image upload failed!');
    }

    const { data: publicUrlData } = await client.storage
      .from('recipe-images') // Use your actual bucket name here
      .getPublicUrl(filePath);

    imageUrl = publicUrlData.publicUrl;
  } else {
    // If no new image is uploaded, fetch the current image URL
    const { data: existingData } = await client
      .from('recipes')
      .select('image_url')
      .eq('id', id);

    imageUrl = existingData?.[0]?.image_url;
  }

  let response;
  if (id) {
    // If editing, optionally delete old image if a new one is uploaded
    if (originalFile && imageUrl) {
      const { data: oldDataArray } = await client
        .from('recipes')
        .select('image_url')
        .eq('id', id);

      const oldImageUrl = oldDataArray?.[0]?.image_url;
      if (oldImageUrl) {
        const imagePath = oldImageUrl.split('/').slice(-2).join('/');
        await client.storage.from('recipe-images').remove([imagePath]); // Update bucket name here as well
      }
    }

    // Update recipe (with manually set updated_at)
    response = await client
      .from('recipes')
      .update({
        name,
        category,
        description,
        ...(imageUrl && { image_url: imageUrl }), // Only update image_url if a new image is uploaded
        updated_at: new Date().toISOString(), // Ensure updated_at is set
      })
      .eq('id', id);
  } else {
    // Insert new recipe if no ID exists
    response = await client
      .from('recipes')
      .insert({
        name,
        category,
        description,
        image_url: imageUrl,
        created_at: new Date().toISOString(),
      });
  }

  if (response.error) {
    console.error(response.error);
    return alert('Failed to save recipe!');
  }

  document.getElementById('recipe-form').reset();
  document.getElementById('form-title').textContent = 'Add New Recipe';
  document.getElementById('status').textContent = 'Recipe saved successfully!';
  document.getElementById('cancel-button').style.display = 'none'; // hides cancel button
  fetchRecipes();
}


// Fetch and display recipes
async function fetchRecipes() {
  const { data, error } = await client.from('recipes').select('*').order('created_at', { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  const container = document.getElementById('recipes-list');
  container.innerHTML = '';

  data.forEach(recipe => {
    const card = document.createElement('div');
    card.className = 'recipe-card';
  
    const shortDesc = recipe.description.length > 70 
  ? recipe.description.slice(0, 70) + ' ... ' 
  : recipe.description;

    card.innerHTML = `
      <img src="${recipe.image_url || '../../imgs/default.jpg'}" alt="${recipe.name}">
      <div class="recipe-info">
        <h4>${recipe.name}</h4>
        <p>${recipe.category}</p>
        <p class="truncate">${shortDesc.replace(/\n/g, '<br>')}</p>
    ${recipe.description.length > 100
      ? `<button onclick='showFullDescription(${JSON.stringify(recipe.name)}, ${JSON.stringify(recipe.description)}, ${JSON.stringify(recipe.image_url || "../../imgs/default.jpg")})'>Show More</button>`
      : ''
    }
    <div class="btn-group">
      <button onclick="editRecipe('${recipe.id}')"><i class="fas fa-edit"></i></button>
      <button onclick="deleteRecipe('${recipe.id}')"><i class="fas fa-trash-alt"></i></button>
    </div>
  </div>
  `;

    container.appendChild(card);
  });
}

// Filter recipes
function filterRecipes() {
  const search = document.getElementById('search-bar').value.toLowerCase();
  const category = document.getElementById('sort-category').value;

  const cards = document.querySelectorAll('.recipe-card');

  cards.forEach(card => {
    const name = card.querySelector('h4').textContent.toLowerCase();
    const cat = card.querySelector('p').textContent;

    const matchName = name.includes(search);
    const matchCategory = !category || cat === category;

    card.style.display = matchName && matchCategory ? 'block' : 'none';
  });
}

// Edit recipe
async function editRecipe(id) {
  const confirmEdit = confirm("Are you sure you want to edit this recipe?");
  if (!confirmEdit) return;

  const { data, error } = await client.from('recipes').select('*').eq('id', id);

  if (error || !data || data.length === 0) {
    return alert('Error fetching recipe');
  }

  const recipe = data[0];

  document.getElementById('recipe-id').value = recipe.id;
  document.getElementById('name').value = recipe.name;
  document.getElementById('category').value = recipe.category;
  document.getElementById('description').value = recipe.description; // Add description to the form
  document.getElementById('form-title').textContent = 'Edit Recipe';

  // Shows the cancel button
  document.getElementById('cancel-button').style.display = 'inline-block';
}

// Delete recipe
async function deleteRecipe(id) {
  const confirmDelete = confirm("Are you sure you want to delete this recipe?");
  if (!confirmDelete) return;

  const { data } = await client.from('recipes').select('image_url').eq('id', id);
  const imageUrl = data?.[0]?.image_url;

  if (imageUrl) {
    const imagePath = imageUrl.split('/').slice(-2).join('/');
    await client.storage.from('recipe-images').remove([imagePath]); // Update bucket name here as well
  }

  const { error } = await client.from('recipes').delete().eq('id', id);

  if (error) {
    console.error(error);
    return alert('Failed to delete recipe');
  }

  fetchRecipes();
}

function showFullDescription(title, description, imageUrl) {
  document.getElementById('modalTitle').textContent = title;

  const safeDescription = escapeHtml(description).replace(/\n/g, '<br>');
  document.getElementById('modalDescription').innerHTML = safeDescription;

  const modalImage = document.getElementById('modalImage');
  if (imageUrl) {
    modalImage.src = imageUrl;
    modalImage.style.display = 'block';
  } else {
    modalImage.style.display = 'none';
  }

  const modal = document.getElementById('descriptionModal');
  modal.style.display = 'flex';
  document.body.classList.add('modal-open'); // Lock scroll
}

function closeModal() {
  document.getElementById('descriptionModal').style.display = 'none';
  document.body.classList.remove('modal-open'); // Unlock scroll
}

// Close when clicking outside modal content
window.addEventListener('click', function(event) {
  const modal = document.getElementById('descriptionModal');
  const content = document.querySelector('.modal-content');

  if (event.target === modal) {
    closeModal();
  }
});

window.addEventListener('keydown', function(event) {
  if (event.key === 'Escape') {
    closeModal();
  }
});

window.onclick = function(event) {
  const modal = document.getElementById('descriptionModal');
  if (event.target === modal) {
    modal.style.display = 'none';
  }
}

function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}