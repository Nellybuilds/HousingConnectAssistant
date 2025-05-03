#!/usr/bin/env python3
"""
This script filters NYC affordable housing data to include only records
with both project_start_date and project_completion_date after May of the current year (2025).
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
        
        # Get the current year
        current_year = 2025  # Hardcoded as per your requirement
        
        # Define the cutoff date (May 1st of current year)
        cutoff_date = datetime.strptime(f"{current_year}-05-01", "%Y-%m-%d")
        
        print(f"Starting with {len(data)} records")
        print(f"Filtering for dates after {cutoff_date.strftime('%Y-%m-%d')}")
        
        # Filter the data
        filtered_data = []
        skipped_missing_dates = 0
        skipped_invalid_dates = 0
        
        for record in data:
            # Check for both project_start_date and project_completion_date
            start_date_str = record.get('project_start_date')
            completion_date_str = record.get('project_completion_date')
            
            if not start_date_str or not completion_date_str:
                # Skip records without both dates
                skipped_missing_dates += 1
                continue
            
            try:
                # Parse the date strings (format: "YYYY-MM-DDT00:00:00.000")
                start_date = datetime.strptime(start_date_str.split('T')[0], "%Y-%m-%d")
                completion_date = datetime.strptime(completion_date_str.split('T')[0], "%Y-%m-%d")
                
                # Check if both dates are after May of current year
                if start_date >= cutoff_date and completion_date >= cutoff_date:
                    filtered_data.append(record)
            except ValueError as e:
                print(f"Warning: Could not parse date: {e}")
                skipped_invalid_dates += 1
                continue
        
        print(f"Filtered to {len(filtered_data)} records with both start and completion dates after May {current_year}")
        print(f"Skipped {skipped_missing_dates} records with missing dates")
        print(f"Skipped {skipped_invalid_dates} records with invalid date formats")
        
        # Save the filtered data
        with open(output_file, 'w') as f:
            json.dump(filtered_data, f, indent=2)
        
        print(f"Filtered data saved to {output_file}")
        
        # If no records match the criteria, add a fallback mode that accepts records with either date after May
        if len(filtered_data) == 0:
            print("\nNo records found with both dates after May. Trying alternative approach...")
            
            filtered_data_alt = []
            for record in data:
                # Check either project_start_date or project_completion_date
                start_date_str = record.get('project_start_date')
                completion_date_str = record.get('project_completion_date')
                
                if not start_date_str and not completion_date_str:
                    continue
                
                try:
                    passes_filter = False
                    
                    # Check start date if available
                    if start_date_str:
                        start_date = datetime.strptime(start_date_str.split('T')[0], "%Y-%m-%d")
                        if start_date >= cutoff_date:
                            passes_filter = True
                    
                    # Check completion date if available
                    if completion_date_str and not passes_filter:
                        completion_date = datetime.strptime(completion_date_str.split('T')[0], "%Y-%m-%d")
                        if completion_date >= cutoff_date:
                            passes_filter = True
                    
                    if passes_filter:
                        filtered_data_alt.append(record)
                        
                except ValueError:
                    continue
            
            # Save the alternative filtered data if we found any
            if filtered_data_alt:
                alt_output_file = "./data/filtered_nyc_housing_alternative.json"
                with open(alt_output_file, 'w') as f:
                    json.dump(filtered_data_alt, f, indent=2)
                
                print(f"Alternative filter found {len(filtered_data_alt)} records with at least one date after May {current_year}")
                print(f"Alternative filtered data saved to {alt_output_file}")
            
        return 0
    
    except Exception as e:
        print(f"Error: {e}")
        return 1

if __name__ == "__main__":
    exit(filter_housing_data())