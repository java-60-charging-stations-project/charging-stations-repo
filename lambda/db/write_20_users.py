import boto3
import random

# Инициализация клиента Cognito
client = boto3.client('cognito-idp', region_name='il-central-1')

USER_POOL_ID = 'il-central-1_BTM220zoZ'
NUM_USERS = 20
NAME_PREFIX = ["John", "Jane", "Jim", "Jill", "Jack", "Jill", "Jim", "Jane", "John", "Jim"]
NAME_SUFFIX = ["Snow", "Doe", "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis"]

for i in range(1, NUM_USERS + 1):
    # Форматируем номер пользователя (001, 002, ...)
    user_num = f"{i:03d}"
    username = f"user-{user_num}@test.com"
    name = f'{random.choice(NAME_PREFIX)} {random.choice(NAME_SUFFIX)}'
    try:
        response = client.admin_create_user(
            UserPoolId=USER_POOL_ID,
            Username=username,
            UserAttributes=[
                {'Name': 'email', 'Value': username},
                {'Name': 'email_verified', 'Value': 'true'},
                {'Name': 'name', 'Value': name}
            ],
            MessageAction='SUPPRESS'
        )
        print(f"Успешно создан: {username}")
        
    except client.exceptions.UsernameExistsException:
        print(f"Пропуск: Пользователь {username} уже существует")
    except Exception as e:
        print(f"Ошибка при создании {username}: {str(e)}")