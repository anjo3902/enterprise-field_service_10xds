from database import db_client

print('COUNT:', db_client.count_collection('service_requests'))
print('LATEST 5:')
db_client.debug_latest_requests(5)
