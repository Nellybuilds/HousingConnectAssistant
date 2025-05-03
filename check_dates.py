import json
import random

# Load the JSON file
with open('./data/nyc_affordable_housing_data.json', 'r') as file:
    data = json.load(file)

# Select 5 random records to examine in more detail
sample_records = random.sample(data, min(5, len(data)))

print(f"Examining {len(sample_records)} random records for date fields:\n")
for i, record in enumerate(sample_records):
    print(f"Record #{i+1}:")
    date_fields = [key for key in record.keys() if any(date_term in key.lower() for date_term in 
                 ['date', 'time', 'open', 'close', 'deadline', 'apply', 'application'])]
    
    if date_fields:
        for field in date_fields:
            print(f"  {field}: {record.get(field)}")
    else:
        print("  No date-related fields found")
    
    # Also print the project name for reference
    print(f"  Project: {record.get('project_name', 'N/A')}")
    print()