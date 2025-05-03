#!/usr/bin/env python3
"""
This script analyzes the date distribution in the NYC affordable housing data
to help understand why there are so few matches for dates after May 2025.
"""

import json
import datetime
from datetime import datetime
from collections import Counter

# Load the JSON file
with open('./data/nyc_affordable_housing_data.json', 'r') as file:
    data = json.load(file)

# Define the cutoff date
current_year = 2025
cutoff_date = datetime.strptime(f"{current_year}-05-01", "%Y-%m-%d")

# Count start and completion dates by year
start_years = Counter()
completion_years = Counter()
projects_after_cutoff = []

print(f"Analyzing date patterns in {len(data)} records...")

for record in data:
    start_date_str = record.get('project_start_date')
    completion_date_str = record.get('project_completion_date')
    
    # Process start date
    if start_date_str:
        try:
            start_date = datetime.strptime(start_date_str.split('T')[0], "%Y-%m-%d")
            start_years[start_date.year] += 1
            
            # Check if start date is after cutoff
            if start_date >= cutoff_date:
                projects_after_cutoff.append({
                    'project_name': record.get('project_name'),
                    'start_date': start_date_str,
                    'completion_date': completion_date_str,
                    'type': 'start_date'
                })
        except ValueError:
            pass
    
    # Process completion date
    if completion_date_str:
        try:
            completion_date = datetime.strptime(completion_date_str.split('T')[0], "%Y-%m-%d")
            completion_years[completion_date.year] += 1
            
            # Check if completion date is after cutoff
            if completion_date >= cutoff_date:
                # Only add if not already added for start date
                already_added = False
                for project in projects_after_cutoff:
                    if project.get('project_name') == record.get('project_name') and project.get('type') == 'start_date':
                        already_added = True
                        break
                        
                if not already_added:
                    projects_after_cutoff.append({
                        'project_name': record.get('project_name'),
                        'start_date': start_date_str,
                        'completion_date': completion_date_str,
                        'type': 'completion_date'
                    })
        except ValueError:
            pass

# Print results
print("\nProject start dates by year:")
for year in sorted(start_years.keys()):
    print(f"{year}: {start_years[year]} projects")

print("\nProject completion dates by year:")
for year in sorted(completion_years.keys()):
    print(f"{year}: {completion_years[year]} projects")

print("\nProjects with dates after May 2025:")
for i, project in enumerate(projects_after_cutoff):
    print(f"{i+1}. {project['project_name']}")
    print(f"   Start Date: {project['start_date']}")
    print(f"   Completion Date: {project['completion_date']}")
    print(f"   Matched on: {project['type']}")
    print()