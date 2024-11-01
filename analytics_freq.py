# -*- coding: utf-8 -*-
import numpy as np
import pandas as pd
import csv
import datetime as datetime
import sys
import json
import time
from datetime import datetime, timedelta
# import datetime

df = pd.read_json('./data_skripsie_nodered/inverter_data.json')

pd.set_option("display.max_columns", None)
pd.set_option("display.max_rows", None)

days = []
hourly_data = []
endIndex = 7
forecastLength = 103

for i in range(7):
    days.append('day_' + str(i))

with open('/home/talialevin/Documents/Home_Energy_System/data_skripsie_nodered/weather_data_historical.json', 'r') as file:
    weather_data = json.load(file)

for day in weather_data['days']:
    day_date = day['datetime']
    for hour in day['hours']:
        hourly_data.append({
            'day_date': day_date,
            'hour': hour['datetime'],
            'solarradiation': hour['solarradiation']
        })

df_weather = pd.DataFrame(hourly_data)

with open('/home/talialevin/Documents/Home_Energy_System/data_skripsie_nodered/inverter_data.csv', mode='w', newline='') as file:
    writer = None  
    for day in days:
        page_num = 1
        while True:
            page_key = f"{day}_page_{page_num}"        
            if page_key not in df:
                break      
            records = df[page_key]["record"]     
            if writer is None:
                columns = records[0].keys()
                writer = csv.DictWriter(file, fieldnames=columns)   
                writer.writeheader()   
            for record in records:
                writer.writerow(record)
            page_num += 1

# df = pd.read_csv('./data_skripsie_nodered/inverter_data.csv')
df = pd.read_csv('/home/talialevin/Documents/Home_Energy_System/data_skripsie_nodered/inverter_data.csv')


df = df[['Time', 'invTotalPower(W)/175', 'batteryEnergy(%)/184', 'pvetoday(kWh)/108', 'dailyUsed(kWh)/84']]

df['Time'] = pd.to_datetime(df['Time'])
df_binned = df.groupby([pd.Grouper(key = 'Time', freq='5min')]).mean()
df_binned['time_only'] = df_binned.index.time
df_binned.set_index('time_only', inplace=True)
df_binned.index = pd.to_datetime(df_binned.index, format='%H:%M:%S').time
df_binned = df_binned.sort_index()
df_binned['time_only'] = pd.to_datetime(df_binned.index, format='%H:%M:%S').time
df_binned = df_binned.reset_index(inplace=False)
df_binned['Time'] = df['Time']
df_binned['power(kW)'] = df_binned['invTotalPower(W)/175']/1000

start_time = datetime.strptime('00:00:00', '%H:%M:%S')
end_time = datetime.strptime('23:55:00', '%H:%M:%S')  
timeNow = []
current_time = start_time

while current_time <= end_time:
    timeNow.append(current_time.strftime('%H:%M:%S'))
    current_time += timedelta(minutes=5)

t = time.localtime()
current_time = time.strftime("%H:%M", t)
now = datetime.now()
hours = now.hour
minutes = now.minute
rounded_minutes = (minutes + 2) // 5 * 5

if rounded_minutes == 60:
    rounded_minutes = 0
    hours += 1
    if hours == 24:  
        hours = 0

hour = current_time[:2]
start_index = (int(hour)) * 12 + int((rounded_minutes/5) - 3)
usedTime = []

for item in range(forecastLength):
    usedTime.append(timeNow[(start_index + item)%288])

battery = []
stdBatt = []
meanBattery = []
std = []
stdP = []
dataPow = []
meanDaily = []
stdDaily = []
dailyNew = []

for item in range(forecastLength):
    tempTime = usedTime[item]
    tempTime = pd.to_datetime(tempTime, format='%H:%M:%S').time()
    tempDF = df_binned[df_binned.time_only == tempTime]
    data = tempDF['power(kW)']
    dataPow.append(data)
    batteryP = tempDF['batteryEnergy(%)/184']
    dailyUse = tempDF['dailyUsed(kWh)/84']
    meanDaily.append(dailyUse.mean())
    meanBattery.append(batteryP.mean())
    std.append(np.std(data))
    stdBatt.append(np.std(batteryP))     
    stdDaily.append(np.std(dailyUse))

for item in range(1, len(meanDaily)-1):
    dailyNew.append(meanDaily[item] + 2*std[item])

stdNew = []
stdNew5 = []
stdFirst = []

tempBattMeanFour = 0

for item in range(len(meanBattery)-3):
    current_time = datetime.now()
    hour = str(current_time)
    hour = hour[11:13]
    # print(hour)
    tempBattMeanOne = meanBattery[item] - meanBattery[item+1]
    tempBattMeanTwo = meanBattery[item+1] - meanBattery[item+2]
    tempBattMeanThree = meanBattery[item+2] - meanBattery[item+3]

    stdVar = 2
    tempBattMeans = [tempBattMeanOne, tempBattMeanTwo, tempBattMeanThree]
    zero_count = sum(1 for temp in tempBattMeans if temp == 0)

    if((int(hour) >= 12) & (int(hour) < 20)): 
        stdVar = 2.5
    else:
        stdVar = 2

    if(zero_count >= 3):
        stdNew.append(meanBattery[item])
    elif((tempBattMeanOne > 0) & (tempBattMeanTwo > 0) & (tempBattMeanThree > 0)):
        stdNew.append(meanBattery[item] - stdVar*std[item])
    elif((tempBattMeanOne > 0) & ((tempBattMeanTwo > 0) | (tempBattMeanThree > 0))):
        stdNew.append(meanBattery[item] - stdVar*std[item])
    elif((tempBattMeanTwo > 0) & ((tempBattMeanOne > 0) | (tempBattMeanThree > 0))):
        stdNew.append(meanBattery[item] - stdVar*std[item])
    elif((tempBattMeanThree > 0) & ((tempBattMeanOne > 0) | (tempBattMeanTwo > 0))):
        stdNew.append(meanBattery[item] - stdVar*std[item])
    else:
        stdNew.append(meanBattery[item] + stdVar*std[item])

battery = stdNew

batteryDifference = []
batteryDifferenceTest = []
diff = []
dailyDiff = []

for item in range(len(dailyNew) - 1):
    tempDaily = dailyNew[item+1] - dailyNew[item]
    dailyDiff.append(tempDaily)

for item in range(len(battery) - 2):
    batteryDifference.append( -1 * (battery[item] - battery[item + 1]))

battery = batteryDifference
batteryTest = batteryDifferenceTest

# weather / pv forecasting
df_binned_pv_inverter = df.groupby([pd.Grouper(key = 'Time', freq='60min')]).mean()
df_binned_pv_inverter['time_only'] = df_binned_pv_inverter.index.time
df_binned_pv_inverter.set_index('time_only', inplace=True)
pv_inverter_gen_hour = []

df_new_pv = df

df_new_pv['timestamp'] = pd.to_datetime(df['Time'])
df_new_pv = df_new_pv.sort_values('timestamp').reset_index()
df_new_pv['hour_start'] = df_new_pv['timestamp'].dt.floor('H')
hour_vals = df_new_pv.groupby('hour_start')['pvetoday(kWh)/108'].first().reset_index()
hour_vals['delta'] = hour_vals['pvetoday(kWh)/108'].diff().fillna(0)
hour_vals.loc[hour_vals['delta'] < 0, 'delta'] = 0
hour_vals['hour'] = hour_vals['hour_start'].dt.strftime('%H:%M:%S')
# print(hour_vals)

for i in range(len(df_binned_pv_inverter) - 1):
    current_time_index = df_binned_pv_inverter.index[i]
    next_time_index = df_binned_pv_inverter.index[i+1]
    pv_inverter_gen_hour.append((df_binned_pv_inverter['pvetoday(kWh)/108'].iloc[i+1] - df_binned_pv_inverter['pvetoday(kWh)/108'].iloc[i]).round(6))

pv_inverter_gen_hour.append(0)
df_binned_pv_inverter['pv_hourly'] = pv_inverter_gen_hour
df_binned_pv_inverter.index = df_binned_pv_inverter.index.astype(str)
df_binned_pv_inverter.loc['23:00:00', 'pv_hourly'] = 0.0
df_binned_pv_inverter.index = pd.to_datetime(df_binned_pv_inverter.index, format='%H:%M:%S').time

temp = df_binned_pv_inverter['pvetoday(kWh)/108']

# for item in range(len(df_binned_pv_inverter)):
#     df_binned_pv_inverter['delta_pv'] = temp[]
    
df_binned_pv_inverter = df_binned_pv_inverter.sort_index()
df_binned_pv_inverter.reset_index(inplace=True)
df_binned_pv_inverter = df_binned_pv_inverter[['index', 'pvetoday(kWh)/108', 'pv_hourly']]
df_binned_pv_inverter.set_index('index', inplace=True)
df_binned_pv_inverter = df_binned_pv_inverter.sort_index()


# get mean for each hour of inverter pv data
mean_values_pv = {}
delta_pv_inverter = []
unique_hours_pv = hour_vals.hour.unique()

# print(unique_hours_pv)
for hour in unique_hours_pv:
    hour_data = df_binned_pv_inverter[df_binned_pv_inverter.index == hour]
    mean_values_pv[hour] = {
        'pvetoday(kWh)/108': (hour_data['pvetoday(kWh)/108'].max() - hour_data['pvetoday(kWh)/108'].min()),
        'pv_hourly': hour_data['pv_hourly'].mean()
    }
    # hour_delta = hour_vals[hour_vals]
    # mean_delta[hour] = 
    # delta_pv_inverter[hour] = hour_data['pvetoday(kWh)/108'].max() - hour_data['pvetoday(kWh)/108'].min()

mean_delta = hour_vals.groupby('hour')['delta'].mean().reset_index()
print(mean_delta)

# print(delta_pv_inverter)
mean_df_pv = pd.DataFrame.from_dict(mean_values_pv, orient='index')

df_weather = df_weather[['hour', 'solarradiation']]
df_weather.set_index('hour', inplace=True)
df_weather = df_weather.sort_index()
df_weather['solarradiation (kWh/m^2)'] = df_weather['solarradiation']/1000*1* 2.117 * 1.052  * 10

# print(df_weather['solarradiation (kWh/m^2)'])


mean_rad = df_weather.groupby('hour')['solarradiation (kWh/m^2)'].mean().reset_index()

print(mean_rad)

factor = pd.Series(mean_delta['delta']/mean_rad['solarradiation (kWh/m^2)']).replace(np.nan, 0).replace(np.inf, 0)

print(factor)

# get mean for each hour of forecasted data
mean_df_weather = {}
unique_hours = df_weather.index.unique()

for hour in unique_hours:
    hour_data = df_weather[df_weather.index == hour]
    mean_df_weather[hour] = {
        'solarradiation': hour_data['solarradiation'].mean(),
        'solarradiation (kWh/m^2)': hour_data['solarradiation (kWh/m^2)'].mean()
    }

mean_df_weather = pd.DataFrame.from_dict(mean_df_weather, orient='index')
mean_df_pv_reset = mean_df_pv.reset_index()
mean_df_weather_reset = mean_df_weather.reset_index()
new_df = mean_df_pv_reset[['pv_hourly']].merge(mean_df_weather_reset[['solarradiation (kWh/m^2)']], left_index=True, right_index=True)

cumulative_solarradiation = []
temp_solar = 0

for item in range(len(new_df['solarradiation (kWh/m^2)'])):
    temp_solar = temp_solar + mean_df_weather_reset['solarradiation (kWh/m^2)'].iloc[item]
    cumulative_solarradiation.append(temp_solar)

multiplier = (new_df['pv_hourly']/10) / new_df['solarradiation (kWh/m^2)'] # kWh / kW/m^2 
multiplier = multiplier.replace(np.nan, 0).replace(np.inf, 0)

battery = pd.Series(battery)
usedTime = pd.Series(usedTime)
daily = pd.Series(dailyDiff)

battery = battery.replace(np.nan, 0)
usedTime = usedTime.replace(np.nan, 0)
daily = daily.replace(np.nan, 0)

# print(len(battery))

results = {
    'battery': {},
    'time': {},
    'solar': {},
    'daily': {}
}

for i in range(96):
    results['battery'][f'b_{i}'] = battery[i]
    results['time'][f't_{i}'] = usedTime[i]
    results['daily'][f'd_{i}'] = daily[i]
    
for i in range(24):
    results['solar'][f's_{i}'] = factor.iloc[i]

df = pd.DataFrame.from_dict(results, orient='index', columns=['value'])

with open('/home/talialevin/Documents/Home_Energy_System/data_skripsie_nodered/forecasted_from_py.json', 'w') as json_file:
    json.dump(results, json_file, indent=4)