#!/usr/bin/env python3
"""
This script analyzes the filtered NYC affordable housing data for 2025
and provides useful statistics about the dataset.
"""

import json
import os
import csv
from datetime import datetime
from collections import defaultdict

def analyze_data():
    # Define the input file
    input_file = "./data/filtered_nyc_affordable_housing_data.json"
    
    # Check if input file exists
    if not os.path.exists(input_file):
        print(f"Error: Input file {input_file} not found.")
        return 1
    
    try:
        # Load the data
        with open(input_file, 'r') as f:
            data = json.load(f)
        
        total_records = len(data)
        print(f"Analyzing {total_records} affordable housing projects for 2025")
        print("="*60)
        
        # Create summary by borough
        borough_stats = defaultdict(int)
        income_stats = defaultdict(int)
        unit_counts = {
            'studio': 0,
            '1br': 0,
            '2br': 0,
            '3br': 0,
            'other': 0,
            'total': 0
        }
        
        # Projects by completion month in 2025
        months_2025 = defaultdict(int)
        
        # Total units across all projects
        total_units = 0
        
        # Populate stats
        for record in data:
            # Borough stats
            borough = record.get('borough', 'Unknown')
            borough_stats[borough] += 1
            
            # Income level stats
            if 'extremely_low_income_units' in record and record['extremely_low_income_units'] != '0':
                income_stats['Extremely Low Income'] += 1
            if 'very_low_income_units' in record and record['very_low_income_units'] != '0':
                income_stats['Very Low Income'] += 1
            if 'low_income_units' in record and record['low_income_units'] != '0':
                income_stats['Low Income'] += 1
            if 'moderate_income_units' in record and record['moderate_income_units'] != '0':
                income_stats['Moderate Income'] += 1
            if 'middle_income_units' in record and record['middle_income_units'] != '0':
                income_stats['Middle Income'] += 1
            if 'other_income_units' in record and record['other_income_units'] != '0':
                income_stats['Other Income Levels'] += 1
                
            # Unit type stats
            if 'studio_units' in record:
                studio_count = int(record['studio_units']) if record['studio_units'].isdigit() else 0
                unit_counts['studio'] += studio_count
                unit_counts['total'] += studio_count
                
            if '_1_br_units' in record:
                br1_count = int(record['_1_br_units']) if record['_1_br_units'].isdigit() else 0
                unit_counts['1br'] += br1_count
                unit_counts['total'] += br1_count
                
            if '_2_br_units' in record:
                br2_count = int(record['_2_br_units']) if record['_2_br_units'].isdigit() else 0
                unit_counts['2br'] += br2_count
                unit_counts['total'] += br2_count
                
            if '_3_br_units' in record:
                br3_count = int(record['_3_br_units']) if record['_3_br_units'].isdigit() else 0
                unit_counts['3br'] += br3_count
                unit_counts['total'] += br3_count
                
            # Total units
            if 'total_units' in record:
                try:
                    total_units += int(record['total_units'])
                except ValueError:
                    pass
                    
            # Completion date month
            completion_date_str = record.get('project_completion_date')
            if completion_date_str:
                try:
                    completion_date = datetime.strptime(completion_date_str.split('T')[0], "%Y-%m-%d")
                    if completion_date.year == 2025:
                        month_name = completion_date.strftime("%B")
                        months_2025[month_name] += 1
                except ValueError:
                    pass
        
        # Print statistics
        print("\nProjects by Borough:")
        for borough, count in sorted(borough_stats.items(), key=lambda x: x[1], reverse=True):
            print(f"{borough}: {count} projects ({count/total_records*100:.1f}%)")
        
        print("\nProjects by Income Level Targeting:")
        for income_level, count in sorted(income_stats.items(), key=lambda x: x[1], reverse=True):
            if count > 0:
                print(f"{income_level}: {count} projects ({count/total_records*100:.1f}%)")
        
        print("\nTotal Units by Type:")
        for unit_type, count in unit_counts.items():
            if unit_type != 'total' and count > 0:
                print(f"{unit_type}: {count} units ({count/unit_counts['total']*100:.1f}% of reported units)")
        
        print(f"\nTotal Housing Units Across All Projects: {total_units}")
        
        print("\nProjects by Completion Month in 2025:")
        for month in ['January', 'February', 'March', 'April', 'May', 'June', 
                     'July', 'August', 'September', 'October', 'November', 'December']:
            if month in months_2025:
                print(f"{month}: {months_2025[month]} projects")
                
        # Write data to CSV for easy use
        csv_file = "./data/nyc_housing_2025.csv"
        with open(csv_file, 'w', newline='') as f:
            writer = csv.writer(f)
            # Write header
            writer.writerow(['Project Name', 'Borough', 'Address', 'Completion Date', 
                            'Total Units', 'Studio Units', '1BR Units', '2BR Units', '3BR Units'])
            
            # Write data
            for record in data:
                writer.writerow([
                    record.get('project_name', ''),
                    record.get('borough', ''),
                    f"{record.get('house_number', '')} {record.get('street_name', '')}, {record.get('borough', '')}, NY {record.get('postcode', '')}",
                    record.get('project_completion_date', '').split('T')[0] if record.get('project_completion_date') else '',
                    record.get('total_units', ''),
                    record.get('studio_units', ''),
                    record.get('_1_br_units', ''),
                    record.get('_2_br_units', ''),
                    record.get('_3_br_units', '')
                ])
                
        print(f"\nDetailed data exported to {csv_file}")
        return 0
    
    except Exception as e:
        print(f"Error: {e}")
        return 1

if __name__ == "__main__":
    exit(analyze_data())