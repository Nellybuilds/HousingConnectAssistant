import json
import sys

def analyze_json_structure():
    try:
        # Load the JSON file
        with open('./data/nyc_affordable_housing_data.json', 'r') as file:
            data = json.load(file)
        
        # Print basic information
        print(f"Total records: {len(data)}")
        
        # Sample the first record to see its structure
        if data:
            first_record = data[0]
            print("\nFields in the first record:")
            for key in first_record.keys():
                print(f"- {key}")
            
            # Print a sample of a record for visualization
            print("\nSample record (first record):")
            print(json.dumps(first_record, indent=2))
            
            # Check for specific date fields we might need
            print("\nSearching for date fields in the first 5 records:")
            date_related_fields = []
            
            # Look at up to 5 records to find date fields
            for i, record in enumerate(data[:5]):
                for key, value in record.items():
                    if any(date_term in key.lower() for date_term in ['date', 'time', 'open', 'close', 'deadline', 'apply', 'application']):
                        if key not in date_related_fields:
                            date_related_fields.append(key)
                            print(f"Found date-related field: {key} = {value}")
        
        else:
            print("The JSON file contains no records.")
            
    except Exception as e:
        print(f"Error analyzing JSON structure: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(analyze_json_structure())