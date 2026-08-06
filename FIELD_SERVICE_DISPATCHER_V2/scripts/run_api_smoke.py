import asyncio
import api_server

customer = {"id": 1, "email": "test@example.com", "role": "customer"}
tech_user = {"id": 2, "email": "tech@example.com", "role": "technician", "technician_id": 1}
admin_user = {"id": 3, "email": "admin@example.com", "role": "admin"}

async def run_tests():
    print('Calling customer_my_requests...')
    res = await api_server.customer_my_requests(limit=10, offset=0, current_user=customer)
    print('customer_my_requests =>', type(res), (res[:2] if isinstance(res, list) else str(res)) )

    print('\nCalling admin_service_requests...')
    res2 = await api_server.admin_service_requests(limit=10, offset=0, current_user=admin_user)
    print('admin_service_requests => count=', len(res2) if isinstance(res2, list) else 'not-list')

    print('\nCalling technician_jobs...')
    res3 = await api_server.technician_jobs(limit=10, offset=0, current_user=tech_user)
    print('technician_jobs =>', res3.keys() if isinstance(res3, dict) else type(res3))

    print('\nCalling technician_job_detail (non-existent id)...')
    try:
        res4 = await api_server.technician_job_detail(999999, current_user=tech_user)
        print('technician_job_detail =>', res4)
    except Exception as e:
        print('technician_job_detail exception:', e)

asyncio.run(run_tests())
