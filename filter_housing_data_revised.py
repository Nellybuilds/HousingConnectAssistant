#!/usr/bin/env python3
"""
This script filters NYC affordable housing data to include:
1. Records with completion dates after May 2025 (primary filter)
2. Records with completion dates in 2025 (secondary filter)

This provides more useful results given the limited data available for future dates.
"""

import json
import datetime
import os
from datetime import datetime

def filter_housing_data():
    # Define the input and output file paths
    input_file = "./data/nyc_affordable_housing_data.json"
    output_file = "./data/filtered_nyc_affordable_housing_data.json"
    
    # Check if input file exists
    if not os.path.exists(input_file):
        print(f"Error: Input file {input_file} not found.")
        return 1
    
    try:
        # Load the data
        with open(input_file, 'r') as f:
            data = json.load(f)
        
        # Current year and cutoff date for primary filter
        current_year = 2025
        cutoff_date = datetime.strptime(f"{current_year}-05-01", "%Y-%m-%d")
        
        # Start date for secondary filter (beginning of 2025)
        start_of_year = datetime.strptime(f"{current_year}-01-01", "%Y-%m-%d")
        
        print(f"Starting with {len(data)} records")
        print(f"Primary filter: dates after {cutoff_date.strftime('%Y-%m-%d')}")
        print(f"Secondary filter: completion dates in {current_year}")
        
        # Filter data for primary criteria (after May 2025)
        primary_filtered_data = []
        # Filter data for secondary criteria (in 2025)
        secondary_filtered_data = []
        
        for record in data:
            completion_date_str = record.get('project_completion_date')
            
            if not completion_date_str:
                continue
            
            try:
                # Parse the date string (format: "YYYY-MM-DDT00:00:00.000")
                completion_date = datetime.strptime(completion_date_str.split('T')[0], "%Y-%m-%d")
                
                # Check for primary filter (after May 2025)
                if completion_date >= cutoff_date:
                    primary_filtered_data.append(record)
                
                # Check for secondary filter (in 2025)
                elif start_of_year <= completion_date < cutoff_date:
                    secondary_filtered_data.append(record)
                    
            except ValueError:
                continue
        
        # Combine the results, with primary results first
        combined_results = primary_filtered_data + secondary_filtered_data
        
        print(f"Primary filter: Found {len(primary_filtered_data)} records with completion dates after May {current_year}")
        print(f"Secondary filter: Found {len(secondary_filtered_data)} records with completion dates in early {current_year}")
        print(f"Combined: {len(combined_results)} total records")
        
        # Save the filtered data
        with open(output_file, 'w') as f:
            json.dump(combined_results, f, indent=2)
        
        print(f"Filtered data saved to {output_file}")
        
        # Also save the two separate datasets
        if primary_filtered_data:
            with open("./data/filtered_housing_after_may.json", 'w') as f:
                json.dump(primary_filtered_data, f, indent=2)
            print(f"Primary filtered data saved to ./data/filtered_housing_after_may.json")
            
        if secondary_filtered_data:
            with open("./data/filtered_housing_early_2025.json", 'w') as f:
                json.dump(secondary_filtered_data, f, indent=2)
            print(f"Secondary filtered data saved to ./data/filtered_housing_early_2025.json")
        
        return 0
    
    except Exception as e:
        print(f"Error: {e}")
        return 1

if __name__ == "__main__":
    exit(filter_housing_data())