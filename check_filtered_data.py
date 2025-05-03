#!/usr/bin/env python3
import json

# Load the filtered data
with open('./data/filtered_nyc_affordable_housing_data.json', 'r') as f:
    data = json.load(f)

print(f'Total records: {len(data)}')
print('\nFirst 5 records:')
for i, record in enumerate(data[:5]):
    print(f"{i+1}. {record.get('project_name')} - Completion: {record.get('project_completion_date')}")

# Show stats by borough
boroughs = {}
for record in data:
    borough = record.get('borough', 'Unknown')
    if borough not in boroughs:
        boroughs[borough] = 0
    boroughs[borough] += 1

print('\nRecords by borough:')
for borough, count in boroughs.items():
    print(f"{borough}: {count} records")