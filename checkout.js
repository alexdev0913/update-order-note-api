function main() {
  let attributes = {};

  const docCookies = document.cookie;
  if (docCookies === "") {
    console.log("No cookies found.");
    return;
  }

  const cookies = docCookies.split("; ").map((cookie) => {
    return {
      name: decodeURIComponent(cookie.split("=")[0]),
      value: decodeURIComponent(cookie.split("=")[1]),
    };
  });

  const shopifyId1 = cookies.find((cookie) => cookie.name == "_shopify_y");
  const shopifyId2 = cookies.find((cookie) => cookie.name == "_y");

  attributes["_track_user_shopify_id_1"] = shopifyId1.value;
  attributes["_track_user_shopify_id_2"] = shopifyId2.value;

  const _gaCookie = cookies.find((cookie) => cookie.name == "_ga");
  let clientId = "";
  if (_gaCookie) {
    clientId = _gaCookie.value.split(".1.")[1];
  
    cookies
      .filter((cookie) => cookie.name.includes("_ga_"))
      .forEach((cookie) => {
        const session = cookie.value.split(".")[2];
  
        attributes[`_track${cookie.name}`] = cookie.value;
        attributes[`_track${cookie.name}_session`] = session;
        attributes[`_track${cookie.name}_clientID`] = clientId;
      });
  } else {
    attributes["_track_ga_"] = "no_information_received";
  }

  const orderId = "{{checkout.order_id}}";
  fetch("https://update-order-note-api.onrender.com/update_order", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      orderId: orderId,
      note: "",
      attributes: attributes,
    }),
  })
    .then(function () {
      console.log("order note updated");
    })
    .catch(function (err) {
      console.log(err);
    });
  
  // Update GA
  {% liquid
    assign order_type = 'One-time Purchase' 
    assign hasSubscribeProduct = false 
    assign hasOneTimeProduct = false 
 
    for line_item in checkout.line_items 
      if line_item.selling_plan_allocation 
        assign hasSubscribeProduct = true 
      else 
        assign hasOneTimeProduct = true 
      endif 
    endfor 
 
    if hasSubscribeProduct and hasOneTimeProduct 
      assign order_type = 'One-time Purchase/Subscribe' 
    elsif hasSubscribeProduct 
      assign order_type = 'Subscribe' 
    endif 
  %}

  let items = [];
  {% for line_item in checkout.line_items %}
    items.push({
      'item_list_id': '{{ 'Checkout_thank_you'  | append:  '_' | append: forloop.index  }}',
      'item_list_name': 'Checkout_thank_you',
      {%- if line_item.selected_or_first_available_variant.id != blank -%}
      'item_id': '{{ line_item.selected_or_first_available_variant.id }}',
      {%- else -%}
      'item_id': '{{ line_item.id }}',
      {%- endif -%}
      'item_name': `{{- line_item.product.title | replace: "'", '' | escape -}}`,
      'affiliation': 'Pulse Tracking Dev',
      'coupon': null,
      'currency': '{{ checkout.currency }}',
      'discount': '',
      'index': {{ forloop.index }},
      'item_brand': 'Pulse Tracking Dev',
      {% if line_item.product_type != blank %}
      'item_category': '{{- line_item.product_type | downcase -}}',
      {% elsif line_item.type != blank %}
      'item_category': '{{- line_item.type | downcase -}}',
      {% elsif line_item.product.type != blank %}
      'item_category': '{{- line_item.product.type | downcase -}}',
      {% else %}
      'item_category': null,
      {% endif %}
      'item_category2':null,
      'item_category3':null,
      'item_category4':null,
      'price': {{- line_item.price | divided_by: 100.0 -}},
      {% if line_item.selected_or_first_available_variant.title != blank %}
      'item_variant': '{{ line_item.selected_or_first_available_variant.title | replace: "'", '' | escape }}',
      {% elsif _product.variant_title != blank %}
      'item_variant': '{{ line_item.variant_title | replace: "'", '' | escape }}',
      {% elsif line_item.product.selected_or_first_available_variant.title != blank %}
      'item_variant': '{{- line_item.product.selected_or_first_available_variant.title | replace: "'", '' | escape -}}',
      {% elsif line_item.title != blank %}
      'item_variant': '{{ line_item.title | replace: "'", '' | escape }}',
      {% elsif line_item.product.title != blank %}
      'item_variant': '{{- line_item.product.title | replace: "'", '' | escape -}}',
      {% else %}
      'item_variant': null,
      {% endif %}
      'quantity': {{ line_item.quantity }},
    });
  {% endfor %}

  const payload = {
    client_id: clientId,
    timestamp_micros: Math.floor(Date.now() / 1000),
    non_personalized_ads: false,
    events: [
      {
        name: "purchase",
        params: {
          currency: "USD",
          coupon: '{% if checkout.discount_applications[0].title %}{{ checkout.discount_applications[0].title }}{% else %}null{% endif checkout.discount_applications[0].title %}',
          value: {{ checkout.total_price | money_without_currency | remove: ".00" | remove: "," }},
          tax: {{ checkout.tax_price | money_without_currency | remove: ".00" | remove: "," }},
          shipping_tier: '{{ checkout.shipping_method.title }}',
          shipping: {{ checkout.shipping_price | money_without_currency | remove: ".00" | remove: "," }},
          payment_type: '{{ checkout.transactions[0].gateway_display_name }}',
          transaction_id: '{{ checkout.order_name }}',
          order_id: '{{checkout.order_id}}',
          order_type: '{{ order_type }}',
          items: items
        }
      }
    ]
  }

  console.log("payload: ", payload);

  fetch("https://update-order-note-api.onrender.com/update_ga", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({payload})
  }).then(function (response) {
    console.log(response)
  }).catch(function (err) {
    console.log(err)
  })
}

main();
