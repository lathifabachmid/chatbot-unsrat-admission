# app.py
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import json

# Initialize Flask app
app = Flask(__name__)
#CORS(app) 

# Load the response_map from the file
with open('response_map.py', 'r') as f:
    response_map = eval(f.read().split('=', 1)[1].strip())
    print('Flask Is Running')

# Save the response_map to the file
def save_response_map():
    with open('response_map.py', 'w') as f:
        f.write(f"response_map = {json.dumps(response_map, indent=4)}")

# Retrieve the entire response_map
@app.route('/response_map', methods=['GET'])
def get_response_map():
    return jsonify(response_map)

# Update a specific key
@app.route('/response_map/<path:key>', methods=['PUT'])
def update_response_map(key):
    data = request.json
    keys = key.split('/') 
    current = response_map

    # find the key to update
    for k in keys[:-1]:
        if k not in current:
            return jsonify({"result": 0, "msg": "Key Tidak Ditemukan!"})
        current = current[k]
    
    # Update the value at the final key
    try:
        current[keys[-1]] = data
        save_response_map()  # Save the updated response_map to the file
        return jsonify({"result": 1})
    except Exception as e:
        return jsonify({"result": 0, "msg": f"Gagal Memperbarui Data: {str(e)}"}), 500

# Delete a specific key
@app.route('/response_map/<intent>/<section>/<path:key>', methods=['DELETE'])
def delete_response_map(intent, section, key):
    if intent not in response_map:
        return jsonify({"msg": "Intent Tidak Ditemukan", "result": 0})
    if section not in response_map[intent]:
        return jsonify({"msg": "Section Tidak Ditemukan", "result": 0})
    if key not in response_map[intent][section]:
        return jsonify({"msg": "Kata Kunci Tidak Ditemukan", "result": 0})

    #get value from request body
    data = request.get_json()
    value_to_delete = data.get('value')

    if value_to_delete is None:
        # Delete the key
        del response_map[intent][section][key]
        save_response_map()  # Save the updated response_map to the file

        return jsonify({"result": 1})
    else :
        try:
            responses= response_map[intent][section][key]
            responses.remove(value_to_delete)
            save_response_map()
            return jsonify({"result" : 1})
        except ValueError:
            return jsonify({"msg": "Value tidak ditemukan di entitas", "result": 0})


# Add a new intent to the response_map
@app.route('/response_map', methods=['POST'])
def add_response_map():
    data = request.json

    for intent in data.keys():
        if intent in response_map:
            return jsonify({"result": 0, "msg": f"Intent '{intent}' Sudah Ada"})
    try:
        response_map.update(data)
        save_response_map()
        return jsonify({"result": 1})
    except Exception as e:
        return jsonify({"result": 0, "msg": f"Gagal Menyimpan Data: {str(e)}"}), 500

# Delete Intent
@app.route('/response_map/<intent>', methods=['DELETE'])
def delete_intent(intent):
    if intent not in response_map:
        return jsonify({"msg": "Intent Tidak Ditemukan!", "result": 0}), 500

    # Delete the entire intent
    del response_map[intent]
    save_response_map()  # Save changes

    return jsonify({"result": 1})

# Endpoint untuk menyajikan file faq_log.json
@app.route('/faq_log.json', methods=['GET'])
def get_faq_log():
    try:
        return send_file('faq_questions.txt', mimetype='application/json')
    except FileNotFoundError:
        return jsonify({"msg": "File faq_log.json tidak ditemukan", "result": 0})

# Endpoint untuk menyajikan file fallback_log.json
@app.route('/fallback_log.json', methods=['GET'])
def get_fallback_log():
    try:
        return send_file('fallback_questions.txt', mimetype='application/json')
    except FileNotFoundError:
        return jsonify({"msg": "File fallback_log.json tidak ditemukan", "result": 0})
    
@app.route('/api/save-intent', methods=['POST'])
def save_intent():
    data = request.json
    intent_name = data['name']
    updated_entities = data['entities']

    # load existing response_map.py as dict
    response_map = load_response_map()
    
    # update only this intent's entities
    response_map[intent_name]['entities'] = updated_entities
    
    # save back to file or DB
    save_response_map(response_map)
    return jsonify({"success": True})


# Run the Flask app
if __name__ == '__main__':
    app.run(debug=True)