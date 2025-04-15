export async function handleApiResponse(response: Response) {
  const data = await response.json();
  
  console.log('API Response status:', response.status);
  console.log('API Response data:', data);
  
  if (!response.ok) {
    console.error('API Error:', data);
    throw new Error(data.error || 'Unknown API error');
  }
  
  return data;
} 