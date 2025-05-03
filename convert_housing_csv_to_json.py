#!/usr/bin/env python3
"""
This script converts NYC housing CSV data to JSON format required by the Housing Connect Helper app.
It specifically transforms data/nyc_housing_2025.csv into data/housingListings.json.
"""

import os
import csv
import json
import datetime
import random

# Define constants
CSV_FILE = './data/nyc_housing_2025.csv'
JSON_OUTPUT = './data/housingListings.json'

# AMI range categories - for demonstration
AMI_RANGES = [
    "30%-50% AMI", 
    "50%-80% AMI", 
    "80%-130% AMI",
    "30%-60% AMI",
    "40%-80% AMI",
    "50%-130% AMI"
]

def get_unit_sizes(row):
    """Extract unit sizes from the CSV row"""
    unit_sizes = []
    if row.get('Studio Units') and row['Studio Units'].strip():
        unit_sizes.append('Studio')
    if row.get('1BR Units') and row['1BR Units'].strip():
        unit_sizes.append('1BR')
    if row.get('2BR Units') and row['2BR Units'].strip():
        unit_sizes.append('2BR')
    if row.get('3BR Units') and row['3BR Units'].strip():
        unit_sizes.append('3BR')
    return unit_sizes

def generate_application_deadline(completion_date):
    """Generate a reasonable application deadline based on completion date"""
    # Parse completion date
    completion_date = datetime.datetime.strptime(completion_date, '%Y-%m-%d')
    
    # Set deadline to be 3-6 months before completion
    months_before = random.randint(3, 6)
    deadline = completion_date - datetime.timedelta(days=30 * months_before)
    
    # Format as string
    return deadline.strftime('%Y-%m-%d')

def csv_to_json():
    """Convert CSV housing data to JSON format"""
    if not os.path.exists(CSV_FILE):
        print(f"Error: CSV file not found at {CSV_FILE}")
        return False
    
    try:
        housing_listings = []
        
        with open(CSV_FILE, 'r') as csvfile:
            reader = csv.DictReader(csvfile)
            
            for row in reader:
                # Extract unit sizes
                unit_sizes = get_unit_sizes(row)
                
                # Generate reasonable application deadline
                application_deadline = generate_application_deadline(row['Completion Date'])
                
                # Select a random AMI range
                ami_range = random.choice(AMI_RANGES)
                
                # Generate reasonable income requirements based on AMI range
                min_ami = int(ami_range.split('-')[0].replace('%', ''))
                max_ami = int(ami_range.split('-')[1].split(' ')[0].replace('%', ''))
                
                # Base minimum income on households at the lower AMI bound for a 1BR
                min_income = min_ami * 800  # Approximate for NYC
                max_income = max_ami * 1200  # Approximate for NYC
                
                # Generate rent prices based on unit sizes
                rent_prices = []
                
                for size in unit_sizes:
                    if size == 'Studio':
                        rent_prices.append(f"${random.randint(600, 900)}")
                    elif size == '1BR':
                        rent_prices.append(f"${random.randint(800, 1300)}")
                    elif size == '2BR':
                        rent_prices.append(f"${random.randint(1000, 1600)}")
                    elif size == '3BR':
                        rent_prices.append(f"${random.randint(1200, 2000)}")
                
                # Standard set of special requirements
                special_requirements = [
                    "5% mobility disability preference",
                    "2% vision/hearing disability preference",
                    "50% community board preference"
                ]
                
                # Add a project description
                project_description = f"Affordable housing development in {row['Borough']} with {row['Total Units']} total units."
                
                # Create the listing object in our required format
                listing = {
                    "project_name": row['Project Name'],
                    "address": row['Address'],
                    "application_deadline": application_deadline,
                    "ami_range": ami_range,
                    "minimum_income": f"${min_income:,}",
                    "maximum_income": f"${max_income:,}",
                    "unit_sizes": unit_sizes,
                    "rent_prices": rent_prices,
                    "application_link": "https://housingconnect.nyc.gov/",
                    "project_description": project_description,
                    "special_requirements": special_requirements,
                    "last_updated": datetime.datetime.now().isoformat()
                }
                
                housing_listings.append(listing)
        
        # Write to JSON file
        with open(JSON_OUTPUT, 'w') as jsonfile:
            json.dump(housing_listings, indent=2, fp=jsonfile)
        
        print(f"Successfully converted {len(housing_listings)} records to JSON")
        print(f"JSON saved to {JSON_OUTPUT}")
        return True
    
    except Exception as e:
        print(f"Error converting CSV to JSON: {e}")
        return False

if __name__ == "__main__":
    csv_to_json()